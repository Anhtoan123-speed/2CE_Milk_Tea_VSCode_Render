/**
 * ==============================================================================
 * 2CE COFFEE ROASTERY · LEAVE REQUEST & AI AUTO-REPLACEMENT SERVICE
 * ==============================================================================
 */
const fs = require('fs');
const path = require('path');
const { supabaseAdmin, isSupabaseConfigured } = require('../config/supabase');
const emailService = require('./email.service');
const { SEED_USERS } = require('./auth.service');
const shiftService = require('./shift.service');
const { SEED_SHIFTS } = shiftService;

const LEAVE_REQUESTS_FILE = path.join(__dirname, '../../data/localLeaveRequests.json');

function loadLocalLeaveRequests() {
  try {
    if (fs.existsSync(LEAVE_REQUESTS_FILE)) {
      const content = fs.readFileSync(LEAVE_REQUESTS_FILE, 'utf8');
      return JSON.parse(content);
    }
  } catch (e) {
    console.error('Lỗi khi đọc file localLeaveRequests.json:', e.message);
  }
  return [];
}

function saveLocalLeaveRequests(data) {
  try {
    const dir = path.dirname(LEAVE_REQUESTS_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(LEAVE_REQUESTS_FILE, JSON.stringify(data, null, 2), 'utf8');
  } catch (e) {
    console.error('Lỗi khi lưu file localLeaveRequests.json:', e.message);
  }
}

// Danh sách đơn xin nghỉ cục bộ: Đọc từ ổ đĩa
let localLeaveRequests = loadLocalLeaveRequests();

// 1. Tạo đơn xin nghỉ đột xuất
async function createLeaveRequest(userId, { shift_id, reason }) {
  if (!shift_id || !reason || !reason.trim()) {
    const error = new Error('Vui lòng chọn ca xin nghỉ và nhập lý do đột xuất.');
    error.statusCode = 400;
    throw error;
  }

  const shiftNum = parseInt(shift_id, 10);
  const user = SEED_USERS.find(u => u.id === userId || u.email === userId) || { id: userId, full_name: 'Nhân viên', email: 'nv@domain.com', department: 'Bếp' };
  const shift = SEED_SHIFTS.find(s => s.id === shiftNum) || { id: shiftNum, name: 'Ca làm', start_time: '13:00:00', end_time: '17:00:00', shift_key: 'chieu_1' };

  if (isSupabaseConfigured) {
    try {
      const { data: reg, error: regErr } = await supabaseAdmin
        .from('registrations')
        .select('id, is_assigned')
        .eq('user_id', userId)
        .eq('shift_id', shiftNum)
        .eq('is_assigned', true)
        .single();

      if (regErr || !reg) {
        const error = new Error('Bạn không được xếp lịch làm việc ở ca này nên không thể tạo đơn xin nghỉ.');
        error.statusCode = 400;
        throw error;
      }
    } catch (e) {
      if (e.statusCode) throw e;
    }
  }

  const newRequest = {
    id: `req-${Date.now()}`,
    user_id: user.id,
    shift_id: shiftNum,
    reason: reason.trim(),
    status: 'PENDING',
    replacement_user_id: null,
    created_at: new Date().toISOString(),
    user: user,
    shift: shift
  };

  localLeaveRequests.unshift(newRequest);
  saveLocalLeaveRequests(localLeaveRequests);

  if (isSupabaseConfigured) {
    try {
      await supabaseAdmin.from('leave_requests').insert({
        user_id: user.id,
        shift_id: shiftNum,
        reason: reason.trim(),
        status: 'PENDING',
        created_at: new Date().toISOString()
      });
    } catch (e) {}
  }

  // Trigger gửi Email tự động cho Quản lý
  const manager = SEED_USERS.find(u => u.role === 'Manager') || { email: 'tranthimyco28@gmail.com' };
  emailService.sendLeaveRequestCreatedEmail(manager.email, {
    employeeName: user.full_name,
    employeeEmail: user.email,
    department: user.department,
    shiftName: shift.name,
    shiftTime: `${shift.start_time.slice(0, 5)} - ${shift.end_time.slice(0, 5)}`,
    reason: reason.trim()
  }).catch(e => console.error('Lỗi gửi email cho quản lý:', e.message));

  return newRequest;
}

// 2. Phê duyệt đơn xin nghỉ & Kích hoạt AI Tìm nhân sự thế chỗ tự động
async function approveLeaveRequest(requestId, managerUser) {
  const request = localLeaveRequests.find(r => r.id === requestId);
  if (!request) {
    const error = new Error('Không tìm thấy đơn xin nghỉ.');
    error.statusCode = 404;
    throw error;
  }

  if (request.status !== 'PENDING') {
    const error = new Error(`Đơn xin nghỉ này đã được xử lý trước đó với trạng thái: ${request.status}.`);
    error.statusCode = 400;
    throw error;
  }

  const applicant = request.user;
  const shift = request.shift;

  // Lấy dữ liệu đăng ký và phân công hiện tại
  const allRegs = shiftService.getLocalRegistrations();

  // Danh sách user_id ĐÃ ĐƯỢC XẾP LỊCH trong chính ca này (Tuyệt đối không lấy người đã có lịch ca này)
  const usersAlreadyAssignedInThisShift = allRegs
    .filter(r => r.shift_id === shift.id && r.is_assigned)
    .map(r => r.user_id);

  // Danh sách user_id ĐÃ ĐĂNG KÝ ca này
  const usersRegisteredInThisShift = allRegs
    .filter(r => r.shift_id === shift.id)
    .map(r => r.user_id);

  // Danh sách nhân sự cùng bộ phận (trừ người xin nghỉ)
  const deptEmployees = SEED_USERS.filter(
    u => u.department === applicant.department && u.role === 'Employee' && u.id !== applicant.id
  );

  // Hàm tính tổng số giờ làm việc hiện tại của nhân viên để ưu tiên cân bằng định biên
  function getStaffAssignedHours(userId) {
    const assigned = allRegs.filter(r => r.user_id === userId && r.is_assigned);
    return assigned.reduce((sum, r) => {
      const s = SEED_SHIFTS.find(item => item.id === r.shift_id);
      return sum + (s ? s.duration : 0);
    }, 0);
  }

  // Hàm kiểm tra nhân viên có ca làm việc nào khác trong cùng ngày hay không
  function hasAnotherShiftOnSameDay(userId, dayKey, currentShiftId) {
    return allRegs.some(r => {
      if (r.user_id !== userId || !r.is_assigned || r.shift_id === currentShiftId) return false;
      const s = SEED_SHIFTS.find(item => item.id === r.shift_id);
      return s && s.day_key === dayKey;
    });
  }

  // [ƯU TIÊN 1 - THEO ĐÚNG YÊU CẦU]: Nhân viên có ĐĂNG KÝ ca đó nhưng KHÔNG ĐƯỢC XẾP LỊCH
  const registeredUnassignedPool = deptEmployees.filter(emp => {
    // 1. Phải chưa có lịch làm trong ca này (tránh lỗi lấy người đã được xếp)
    const isWorkingShift = usersAlreadyAssignedInThisShift.includes(emp.id) || usersAlreadyAssignedInThisShift.includes(emp.email);
    if (isWorkingShift) return false;

    // 2. Phải là người CÓ ĐĂNG KÝ ca này
    const hasReg = usersRegisteredInThisShift.includes(emp.id) || usersRegisteredInThisShift.includes(emp.email);
    return hasReg;
  });

  let chosenReplacement = null;
  let isFromRegistered = false;

  if (registeredUnassignedPool.length > 0) {
    // Sắp xếp ưu tiên:
    // 1. Người chưa có ca nào trong ngày đó
    // 2. Người có tổng số giờ làm ít hơn (Fairness)
    registeredUnassignedPool.sort((a, b) => {
      const conflictA = hasAnotherShiftOnSameDay(a.id, shift.day_key, shift.id) ? 1 : 0;
      const conflictB = hasAnotherShiftOnSameDay(b.id, shift.day_key, shift.id) ? 1 : 0;
      if (conflictA !== conflictB) return conflictA - conflictB;
      return getStaffAssignedHours(a.id) - getStaffAssignedHours(b.id);
    });

    chosenReplacement = registeredUnassignedPool[0];
    isFromRegistered = true;
  } else {
    // [ƯU TIÊN 2 - DỰ PHÒNG]: Nếu không có ai đăng ký ca này mà chưa xếp, lấy nhân sự cùng bộ phận chưa có lịch ca này
    const availableDeptPool = deptEmployees.filter(emp => {
      const isWorkingShift = usersAlreadyAssignedInThisShift.includes(emp.id) || usersAlreadyAssignedInThisShift.includes(emp.email);
      return !isWorkingShift;
    });

    if (availableDeptPool.length > 0) {
      availableDeptPool.sort((a, b) => {
        const conflictA = hasAnotherShiftOnSameDay(a.id, shift.day_key, shift.id) ? 1 : 0;
        const conflictB = hasAnotherShiftOnSameDay(b.id, shift.day_key, shift.id) ? 1 : 0;
        if (conflictA !== conflictB) return conflictA - conflictB;
        return getStaffAssignedHours(a.id) - getStaffAssignedHours(b.id);
      });

      chosenReplacement = availableDeptPool[0];
      isFromRegistered = false;
    }
  }

  // CẬP NHẬT TRỰC TIẾP VÀ ĐỒNG BỘ LỊCH LÀM VIỆC NGAY LẬP TỨC:
  // Rút người xin nghỉ và phân bổ người thay thế vào bảng phân công
  shiftService.executeShiftReplacement(shift.id, applicant.id, chosenReplacement ? chosenReplacement.id : null);

  // Cập nhật trạng thái đơn xin nghỉ
  request.status = 'APPROVED';
  request.replacement_user_id = chosenReplacement ? chosenReplacement.id : null;
  request.replacement = chosenReplacement;
  request.replacement_note = chosenReplacement 
    ? (isFromRegistered ? 'Nhân sự đã đăng ký ca này nhưng chưa được xếp' : 'Nhân sự cùng bộ phận được điều động thế chỗ')
    : 'Không có nhân sự thay thế';
  request.resolved_at = new Date().toISOString();
  saveLocalLeaveRequests(localLeaveRequests);

  // Gửi email thông báo cho các bên liên quan nếu có cấu hình
  if (applicant && shift) {
    const shiftTimeStr = `${shift.start_time.slice(0, 5)} - ${shift.end_time.slice(0, 5)}`;
    emailService.sendLeaveApprovalEmails({
      applicantEmail: applicant.email,
      applicantName: applicant.full_name,
      replacementEmail: chosenReplacement ? chosenReplacement.email : null,
      replacementName: chosenReplacement ? chosenReplacement.full_name : null,
      shiftName: shift.name,
      shiftTime: shiftTimeStr
    }).catch(e => console.error('Lỗi gửi email duyệt đơn:', e.message));
  }

  const replacementDesc = chosenReplacement
    ? `${chosenReplacement.full_name} (${isFromRegistered ? 'nhân sự đã đăng ký ca này nhưng chưa được xếp' : 'nhân sự cùng bộ phận'})`
    : null;

  return {
    success: true,
    message: chosenReplacement
      ? `Đã duyệt đơn xin nghỉ của ${applicant.full_name}. AI đã tự động phân bổ ${replacementDesc} vào thay thế. Lịch làm việc toàn quán đã được cập nhật ngay lập tức!`
      : `Đã duyệt đơn xin nghỉ của ${applicant.full_name}. Hiện không có nhân sự thế chỗ, ca làm việc được chuyển sang trạng thái thiếu người.`,
    request,
    replacement: chosenReplacement
  };
}

// 3. Từ chối đơn xin nghỉ
async function rejectLeaveRequest(requestId, managerUser, note = '') {
  const request = localLeaveRequests.find(r => r.id === requestId);
  if (!request) {
    const error = new Error('Không tìm thấy đơn xin nghỉ.');
    error.statusCode = 404;
    throw error;
  }

  if (request.status !== 'PENDING') {
    const error = new Error(`Đơn xin nghỉ này đã được xử lý trước đó với trạng thái: ${request.status}.`);
    error.statusCode = 400;
    throw error;
  }

  request.status = 'REJECTED';
  request.note = note ? note.trim() : null;
  request.resolved_at = new Date().toISOString();
  saveLocalLeaveRequests(localLeaveRequests);

  emailService.sendLeaveRejectedEmail(
    request.user?.email || 'user@domain.com',
    request.user?.full_name || 'Nhân viên',
    request.shift?.name || 'Ca làm',
    note
  ).catch(e => console.error('Lỗi gửi email từ chối:', e.message));

  return {
    success: true,
    message: `Đã từ chối đơn xin nghỉ của ${request.user?.full_name || 'nhân viên'}.`,
    request
  };
}

// 4. Lấy tất cả đơn xin nghỉ
async function getAllLeaveRequests() {
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabaseAdmin
        .from('leave_requests')
        .select(`
          id,
          user_id,
          shift_id,
          reason,
          status,
          replacement_user_id,
          note,
          created_at,
          resolved_at,
          user:user_id (id, full_name, email, department),
          shift:shift_id (id, name, shift_key, duration, start_time, end_time),
          replacement:replacement_user_id (id, full_name, email, department)
        `)
        .order('created_at', { ascending: false });

      if (!error && data && data.length > 0) return data;
    } catch (e) {}
  }

  return localLeaveRequests;
}

module.exports = {
  createLeaveRequest,
  approveLeaveRequest,
  rejectLeaveRequest,
  getAllLeaveRequests
};
