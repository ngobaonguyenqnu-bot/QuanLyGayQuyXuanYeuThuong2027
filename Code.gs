
/**
 * QUẢN LÝ GÂY QUỸ XUÂN YÊU THƯƠNG 2027
 */

const CONFIG = {
  SPREADSHEET_ID: '16AHwL8dfkVD4XU2q6Bzpf5OBY7shvPHFDCiwEOn8fxg',
  TIMEZONE: 'Asia/Ho_Chi_Minh',
  SESSION_SECONDS: 21600,
  SHEETS: {
    SESSIONS: 'BuoiGayQuy',
    ROUTES: 'TuyenDuong',
    EXPENSES: 'ChiTieu',
    INDEPENDENT_EXPENSES: 'ChiRieng'
  }
};

const AUTH = {
  USER_KEY: 'XYT_ADMIN_USERNAME',
  SALT_KEY: 'XYT_ADMIN_SALT',
  HASH_KEY: 'XYT_ADMIN_HASH'
};

/* =========================
   KHỞI TẠO HỆ THỐNG
========================= */

function setupSystem() {
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);

  createSheet_(ss, CONFIG.SHEETS.SESSIONS, [
    'ID', 'NgayGayQuy', 'TongTienMat', 'TongChuyenKhoan',
    'TongThu', 'TongChi', 'TienConLai', 'GhiChu', 'CapNhatLuc'
  ]);

  createSheet_(ss, CONFIG.SHEETS.ROUTES, [
    'ID', 'BuoiID', 'NgayGayQuy', 'TenTuyen',
    'TienMat', 'ChuyenKhoan', 'TongThu', 'GhiChu', 'CapNhatLuc'
  ]);

  createSheet_(ss, CONFIG.SHEETS.EXPENSES, [
    'ID', 'BuoiID', 'NgayGayQuy', 'NoiDung',
    'SoTien', 'NgayGioMua', 'GhiChu', 'CapNhatLuc'
  ]);

  createSheet_(ss, CONFIG.SHEETS.INDEPENDENT_EXPENSES, [
    'ID', 'NgayChi', 'NoiDung', 'SoTien',
    'NgayGioChi', 'GhiChu', 'CapNhatLuc'
  ]);

  ss.setSpreadsheetTimeZone(CONFIG.TIMEZONE);

  initializeAdmin_();

  return 'Khởi tạo thành công.';
}

function createSheet_(ss, name, headers) {
  let sheet = ss.getSheetByName(name);

  if (!sheet) {
    sheet = ss.insertSheet(name);
  }

  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  }

  sheet.setFrozenRows(1);

  sheet.getRange(1, 1, 1, headers.length)
    .setBackground('#0759b5')
    .setFontColor('#ffffff')
    .setFontWeight('bold');
}


/**
 * API endpoint dành cho giao diện Vercel.
 * Vercel gọi endpoint này phía server; không gọi trực tiếp từ trình duyệt.
 */
function doPost(e) {
  try {
    const payload = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    const method = String(payload.method || '');
    const args = Array.isArray(payload.args) ? payload.args : [];

    const allowed = {
      login: login,
      logout: logout,
      changeAdminPassword: changeAdminPassword,
      getDashboard: getDashboard,
      saveFundraising: saveFundraising,
      updateFundraisingSession: updateFundraisingSession,
      deleteFundraisingSession: deleteFundraisingSession,
      saveExpense: saveExpense,
      deleteExpense: deleteExpense,
      saveIndependentExpense: saveIndependentExpense,
      updateIndependentExpense: updateIndependentExpense,
      deleteIndependentExpense: deleteIndependentExpense
    };

    if (!Object.prototype.hasOwnProperty.call(allowed, method)) {
      throw new Error('Phương thức API không được hỗ trợ.');
    }

    const result = allowed[method].apply(null, args);
    return ContentService
      .createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({
        success: false,
        message: error && error.message ? error.message : String(error)
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet() {
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('Xuân Yêu Thương 2027')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

/* =========================
   TÀI KHOẢN ADMIN
========================= */

function initializeAdmin_() {
  const props = PropertiesService.getScriptProperties();

  if (props.getProperty(AUTH.HASH_KEY)) {
    return;
  }

  const username = 'admin';
  const password = 'Xyt2027@Admin';
  const salt = Utilities.getUuid() + Utilities.getUuid();

  props.setProperty(AUTH.USER_KEY, username);
  props.setProperty(AUTH.SALT_KEY, salt);
  props.setProperty(AUTH.HASH_KEY, hashPassword_(password, salt));
}

function hashPassword_(password, salt) {
  const bytes = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    salt + String(password),
    Utilities.Charset.UTF_8
  );

  return bytes.map(byte => {
    const value = (byte + 256) % 256;
    return value.toString(16).padStart(2, '0');
  }).join('');
}

function login(username, password) {
  try {
    initializeAdmin_();

    username = String(username || '').trim();
    password = String(password || '');

    if (!username || !password) {
      throw new Error('Vui lòng nhập tên đăng nhập và mật khẩu.');
    }

    const props = PropertiesService.getScriptProperties();

    const savedUsername = props.getProperty(AUTH.USER_KEY);
    const salt = props.getProperty(AUTH.SALT_KEY);
    const savedHash = props.getProperty(AUTH.HASH_KEY);

    const inputHash = hashPassword_(password, salt);

    if (
      username !== savedUsername ||
      !constantTimeCompare_(inputHash, savedHash)
    ) {
      throw new Error('Tên đăng nhập hoặc mật khẩu không chính xác.');
    }

    const token = Utilities.getUuid() + Utilities.getUuid();

    CacheService.getScriptCache().put(
      'XYT_SESSION_' + token,
      username,
      CONFIG.SESSION_SECONDS
    );

    return {
      success: true,
      token: token,
      username: username,
      expiresIn: CONFIG.SESSION_SECONDS
    };

  } catch (error) {
    return {
      success: false,
      message: error.message || 'Đăng nhập thất bại.'
    };
  }
}

function constantTimeCompare_(a, b) {
  a = String(a || '');
  b = String(b || '');

  if (a.length !== b.length) {
    return false;
  }

  let result = 0;

  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }

  return result === 0;
}

function requireAuth_(token) {
  token = String(token || '');

  if (!token) {
    throw new Error('Phiên đăng nhập không hợp lệ. Vui lòng đăng nhập lại.');
  }

  const cache = CacheService.getScriptCache();
  const username = cache.get('XYT_SESSION_' + token);

  if (!username || username !== 'admin') {
    throw new Error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
  }

  return username;
}

function logout(token) {
  if (token) {
    CacheService.getScriptCache().remove(
      'XYT_SESSION_' + String(token)
    );
  }

  return { success: true };
}

/**
 * Đổi mật khẩu Admin.
 * Chỉ gọi được khi có phiên đăng nhập hợp lệ.
 */
function changeAdminPassword(token, oldPassword, newPassword) {
  try {
    requireAuth_(token);

    if (!newPassword || String(newPassword).length < 10) {
      throw new Error('Mật khẩu mới phải có ít nhất 10 ký tự.');
    }

    const props = PropertiesService.getScriptProperties();
    const salt = props.getProperty(AUTH.SALT_KEY);
    const savedHash = props.getProperty(AUTH.HASH_KEY);

    if (!constantTimeCompare_(
      hashPassword_(oldPassword, salt),
      savedHash
    )) {
      throw new Error('Mật khẩu hiện tại không chính xác.');
    }

    const newSalt = Utilities.getUuid() + Utilities.getUuid();

    props.setProperty(AUTH.SALT_KEY, newSalt);
    props.setProperty(
      AUTH.HASH_KEY,
      hashPassword_(newPassword, newSalt)
    );

    return {
      success: true,
      message: 'Đổi mật khẩu thành công.'
    };

  } catch (error) {
    return {
      success: false,
      message: error.message
    };
  }
}

/* =========================
   GOOGLE SHEETS
========================= */

function getSheet_(name) {
  const sheet = SpreadsheetApp
    .openById(CONFIG.SPREADSHEET_ID)
    .getSheetByName(name);

  if (!sheet) {
    throw new Error(
      'Không tìm thấy trang tính ' + name +
      '. Hãy chạy setupSystem() trước.'
    );
  }

  return sheet;
}

function getIndependentExpenseSheet_() {
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  let sheet = ss.getSheetByName(CONFIG.SHEETS.INDEPENDENT_EXPENSES);
  if (!sheet) {
    sheet = ss.insertSheet(CONFIG.SHEETS.INDEPENDENT_EXPENSES);
    const headers = [
      'ID', 'NgayChi', 'NoiDung', 'SoTien',
      'NgayGioChi', 'GhiChu', 'CapNhatLuc'
    ];
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, headers.length)
      .setBackground('#ea8a16')
      .setFontColor('#ffffff')
      .setFontWeight('bold');
  }
  return sheet;
}

function readRows_(sheet) {
  if (sheet.getLastRow() < 2) {
    return [];
  }

  return sheet.getRange(
    2, 1,
    sheet.getLastRow() - 1,
    sheet.getLastColumn()
  ).getValues();
}

function normalizeDate_(value) {
  if (value instanceof Date) {
    return Utilities.formatDate(
      value,
      CONFIG.TIMEZONE,
      'yyyy-MM-dd'
    );
  }

  const text = String(value || '').trim();

  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    throw new Error('Ngày không hợp lệ.');
  }

  return text;
}

function createId_() {
  return Utilities.getUuid();
}

function money_(value) {
  const amount = Number(value || 0);

  if (!Number.isFinite(amount) || amount < 0) {
    throw new Error('Số tiền không hợp lệ.');
  }

  return Math.round(amount);
}

function getOrCreateSessionId_(date) {
  const sheet = getSheet_(CONFIG.SHEETS.SESSIONS);
  const rows = readRows_(sheet);

  for (let i = 0; i < rows.length; i++) {
    if (normalizeDate_(rows[i][1]) === date) {
      return String(rows[i][0]);
    }
  }

  const id = createId_();

  sheet.appendRow([
    id, date, 0, 0, 0, 0, 0, '', new Date()
  ]);

  return id;
}

/* =========================
   TÍNH LẠI TỔNG BUỔI GÂY QUỸ
========================= */

function recalculateSessionTotalsById_(sessionId, note) {
  const sessionSheet = getSheet_(CONFIG.SHEETS.SESSIONS);
  const routeSheet = getSheet_(CONFIG.SHEETS.ROUTES);
  const expenseSheet = getSheet_(CONFIG.SHEETS.EXPENSES);
  const sessionRows = readRows_(sessionSheet);
  const routeRows = readRows_(routeSheet);
  const expenseRows = readRows_(expenseSheet);

  let rowNumber = 0;
  let oldNote = '';
  sessionRows.forEach((row, index) => {
    if (String(row[0]) === String(sessionId)) {
      rowNumber = index + 2;
      oldNote = String(row[7] || '');
    }
  });
  if (!rowNumber) throw new Error('Không tìm thấy buổi gây quỹ.');

  let cash = 0;
  let transfer = 0;
  let expense = 0;
  routeRows.forEach(row => {
    if (String(row[1]) === String(sessionId)) {
      cash += Number(row[4] || 0);
      transfer += Number(row[5] || 0);
    }
  });
  expenseRows.forEach(row => {
    if (String(row[1]) === String(sessionId)) expense += Number(row[4] || 0);
  });

  const income = cash + transfer;
  sessionSheet.getRange(rowNumber, 3, 1, 7).setValues([[
    cash, transfer, income, expense, income - expense,
    note === undefined ? oldNote : String(note || ''), new Date()
  ]]);
}

function updateSessionTotals_(date, note) {
  date = normalizeDate_(date);
  const rows = readRows_(getSheet_(CONFIG.SHEETS.SESSIONS));
  const found = rows.find(row => normalizeDate_(row[1]) === date);
  if (!found) throw new Error('Không tìm thấy buổi gây quỹ.');
  recalculateSessionTotalsById_(String(found[0]), note);
}

/* =========================
   SỬA / XÓA BUỔI GÂY QUỸ
========================= */

function updateFundraisingSession(token, sessionId, data) {
  try {
    requireAuth_(token);
    sessionId = String(sessionId || '').trim();
    if (!sessionId || !data || !Array.isArray(data.routes)) {
      throw new Error('Dữ liệu chỉnh sửa buổi gây quỹ không hợp lệ.');
    }
    const date = normalizeDate_(data.date);
    if (!data.routes.length) throw new Error('Vui lòng thêm ít nhất một tuyến.');

    const routes = data.routes.map(route => {
      const name = String(route.name || '').trim();
      if (!name) throw new Error('Vui lòng nhập tên tất cả tuyến.');
      return {
        name,
        cash: money_(route.cash),
        transfer: money_(route.transfer),
        note: String(route.note || '').trim()
      };
    });

    const lock = LockService.getScriptLock();
    lock.waitLock(10000);
    try {
      const sessionSheet = getSheet_(CONFIG.SHEETS.SESSIONS);
      const sessionRows = readRows_(sessionSheet);
      let sessionRow = 0;
      sessionRows.forEach((row, index) => {
        if (String(row[0]) === sessionId) sessionRow = index + 2;
      });
      if (!sessionRow) throw new Error('Không tìm thấy buổi gây quỹ cần sửa.');

      const duplicate = sessionRows.some(row =>
        String(row[0]) !== sessionId && normalizeDate_(row[1]) === date
      );
      if (duplicate) throw new Error('Đã tồn tại một buổi gây quỹ vào ngày này.');

      const oldDate = normalizeDate_(sessionSheet.getRange(sessionRow, 2).getValue());
      sessionSheet.getRange(sessionRow, 2).setValue(date);
      sessionSheet.getRange(sessionRow, 8).setValue(String(data.note || '').trim());
      sessionSheet.getRange(sessionRow, 9).setValue(new Date());

      const routeSheet = getSheet_(CONFIG.SHEETS.ROUTES);
      const routeRows = readRows_(routeSheet);
      const removeRows = [];
      routeRows.forEach((row, index) => {
        if (String(row[1]) === sessionId) removeRows.push(index + 2);
      });
      removeRows.reverse().forEach(rowNumber => routeSheet.deleteRow(rowNumber));

      const now = new Date();
      const routeValues = routes.map(route => [
        createId_(), sessionId, date, route.name, route.cash,
        route.transfer, route.cash + route.transfer, route.note, now
      ]);
      routeSheet.getRange(routeSheet.getLastRow() + 1, 1, routeValues.length, 9)
        .setValues(routeValues);

      // Cập nhật ngày cho các khoản chi đang gắn với buổi, không xóa chúng.
      const expenseSheet = getSheet_(CONFIG.SHEETS.EXPENSES);
      const expenseRows = readRows_(expenseSheet);
      expenseRows.forEach((row, index) => {
        if (String(row[1]) === sessionId) {
          expenseSheet.getRange(index + 2, 3).setValue(date);
          expenseSheet.getRange(index + 2, 8).setValue(new Date());
        }
      });

      recalculateSessionTotalsById_(sessionId, String(data.note || '').trim());
      return { success: true, message: 'Đã cập nhật buổi gây quỹ thành công.' };
    } finally {
      lock.releaseLock();
    }
  } catch (error) {
    console.error(error);
    return { success: false, message: error.message || String(error) };
  }
}

function deleteFundraisingSession(token, sessionId) {
  try {
    requireAuth_(token);
    sessionId = String(sessionId || '').trim();
    if (!sessionId) throw new Error('Thiếu mã buổi gây quỹ.');

    const lock = LockService.getScriptLock();
    lock.waitLock(10000);
    try {
      const sessionSheet = getSheet_(CONFIG.SHEETS.SESSIONS);
      const sessionRows = readRows_(sessionSheet);
      let sessionRow = 0;
      sessionRows.forEach((row, index) => {
        if (String(row[0]) === sessionId) sessionRow = index + 2;
      });
      if (!sessionRow) throw new Error('Không tìm thấy buổi gây quỹ cần xóa.');

      [[getSheet_(CONFIG.SHEETS.ROUTES), 1], [getSheet_(CONFIG.SHEETS.EXPENSES), 1]].forEach(([sheet, idIndex]) => {
        const rows = readRows_(sheet);
        const removeRows = [];
        rows.forEach((row, index) => {
          if (String(row[idIndex]) === sessionId) removeRows.push(index + 2);
        });
        removeRows.reverse().forEach(rowNumber => sheet.deleteRow(rowNumber));
      });

      sessionSheet.deleteRow(sessionRow);
      return { success: true, message: 'Đã xóa buổi gây quỹ và các dữ liệu đi kèm.' };
    } finally {
      lock.releaseLock();
    }
  } catch (error) {
    console.error(error);
    return { success: false, message: error.message || String(error) };
  }
}

/* =========================
   LƯU TIỀN GÂY QUỸ
========================= */

function saveFundraising(token, data) {
  try {
    requireAuth_(token);

    if (!data || !Array.isArray(data.routes)) {
      throw new Error('Dữ liệu gây quỹ không hợp lệ.');
    }

    const date = normalizeDate_(data.date);

    if (!data.routes.length) {
      throw new Error('Vui lòng thêm ít nhất một tuyến.');
    }

    const routes = data.routes.map(route => {
      const name = String(route.name || '').trim();

      if (!name) {
        throw new Error('Vui lòng nhập tên tuyến.');
      }

      return {
        name: name,
        cash: money_(route.cash),
        transfer: money_(route.transfer),
        note: String(route.note || '').trim()
      };
    });

    const lock = LockService.getScriptLock();
    lock.waitLock(10000);

    try {
      const sessionId = getOrCreateSessionId_(date);
      const routeSheet = getSheet_(CONFIG.SHEETS.ROUTES);
      const oldRows = readRows_(routeSheet);

      // Xóa các tuyến đã lưu của ngày này trước khi thay thế.
      const deleteRows = [];

      oldRows.forEach((row, index) => {
        if (
          String(row[1]) === sessionId ||
          normalizeDate_(row[2]) === date
        ) {
          deleteRows.push(index + 2);
        }
      });

      deleteRows.reverse().forEach(rowNumber => {
        routeSheet.deleteRow(rowNumber);
      });

      let cash = 0;
      let transfer = 0;

      const now = new Date();

      const values = routes.map(route => {
        cash += route.cash;
        transfer += route.transfer;

        return [
          createId_(),
          sessionId,
          date,
          route.name,
          route.cash,
          route.transfer,
          route.cash + route.transfer,
          route.note,
          now
        ];
      });

      routeSheet.getRange(
        routeSheet.getLastRow() + 1,
        1,
        values.length,
        values[0].length
      ).setValues(values);

      updateSessionTotals_(date, data.note || '');

      return {
        success: true,
        message: 'Đã lưu dữ liệu gây quỹ thành công.'
      };

    } finally {
      lock.releaseLock();
    }

  } catch (error) {
    console.error(error);

    return {
      success: false,
      message: error.message || String(error)
    };
  }
}

/* =========================
   LƯU KHOẢN CHI
========================= */

function saveExpense(token, data) {
  try {
    requireAuth_(token);

    if (!data) {
      throw new Error('Dữ liệu khoản chi không hợp lệ.');
    }

    const date = normalizeDate_(data.date);
    const content = String(data.content || '').trim();
    const amount = money_(data.amount);
    const purchaseDateTime = String(
      data.purchaseDateTime || ''
    );

    if (!content) {
      throw new Error('Vui lòng nhập nội dung chi.');
    }

    if (amount <= 0) {
      throw new Error('Số tiền phải lớn hơn 0.');
    }

    const purchaseDate = new Date(purchaseDateTime);

    if (isNaN(purchaseDate.getTime())) {
      throw new Error('Ngày giờ mua không hợp lệ.');
    }

    const lock = LockService.getScriptLock();
    lock.waitLock(10000);

    try {
      const sessionId = getOrCreateSessionId_(date);
      const sheet = getSheet_(CONFIG.SHEETS.EXPENSES);

      sheet.appendRow([
        createId_(),
        sessionId,
        date,
        content,
        amount,
        purchaseDate,
        String(data.note || '').trim(),
        new Date()
      ]);

      updateSessionTotals_(date);

      return {
        success: true,
        message: 'Đã lưu khoản chi thành công.'
      };

    } finally {
      lock.releaseLock();
    }

  } catch (error) {
    console.error(error);

    return {
      success: false,
      message: error.message || String(error)
    };
  }
}

/* =========================
   LƯU CHI RIÊNG (KHÔNG GẮN BUỔI/TUYẾN)
========================= */

function saveIndependentExpense(token, data) {
  try {
    requireAuth_(token);
    if (!data) throw new Error('Dữ liệu chi riêng không hợp lệ.');

    const date = normalizeDate_(data.date);
    const content = String(data.content || '').trim();
    const amount = money_(data.amount);
    const purchaseDateTime = String(data.purchaseDateTime || '');

    if (!content) throw new Error('Vui lòng nhập nội dung chi.');
    if (amount <= 0) throw new Error('Số tiền phải lớn hơn 0.');

    const purchaseDate = new Date(purchaseDateTime);
    if (isNaN(purchaseDate.getTime())) {
      throw new Error('Ngày giờ chi không hợp lệ.');
    }

    const lock = LockService.getScriptLock();
    lock.waitLock(10000);
    try {
      const sheet = getIndependentExpenseSheet_();
      sheet.appendRow([
        createId_(), date, content, amount, purchaseDate,
        String(data.note || '').trim(), new Date()
      ]);
      return { success: true, message: 'Đã lưu khoản chi riêng thành công.' };
    } finally {
      lock.releaseLock();
    }
  } catch (error) {
    console.error(error);
    return { success: false, message: error.message || String(error) };
  }
}

/* =========================
   SỬA / XÓA CHI RIÊNG
========================= */

function updateIndependentExpense(token, id, data) {
  try {
    requireAuth_(token);
    id = String(id || '').trim();
    if (!id || !data) throw new Error('Dữ liệu chỉnh sửa không hợp lệ.');

    const date = normalizeDate_(data.date);
    const content = String(data.content || '').trim();
    const amount = money_(data.amount);
    const purchaseDateTime = String(data.purchaseDateTime || '');
    if (!content) throw new Error('Vui lòng nhập nội dung chi.');
    if (amount <= 0) throw new Error('Số tiền phải lớn hơn 0.');

    const purchaseDate = new Date(purchaseDateTime);
    if (isNaN(purchaseDate.getTime())) throw new Error('Ngày giờ chi không hợp lệ.');

    const lock = LockService.getScriptLock();
    lock.waitLock(10000);
    try {
      const sheet = getIndependentExpenseSheet_();
      const rows = readRows_(sheet);
      for (let i = 0; i < rows.length; i++) {
        if (String(rows[i][0]) === id) {
          sheet.getRange(i + 2, 2, 1, 6).setValues([[
            date, content, amount, purchaseDate,
            String(data.note || '').trim(), new Date()
          ]]);
          return { success: true, message: 'Đã cập nhật khoản chi riêng.' };
        }
      }
      throw new Error('Không tìm thấy khoản chi riêng cần sửa.');
    } finally {
      lock.releaseLock();
    }
  } catch (error) {
    console.error(error);
    return { success: false, message: error.message || String(error) };
  }
}

function deleteIndependentExpense(token, id) {
  try {
    requireAuth_(token);
    id = String(id || '').trim();
    if (!id) throw new Error('Thiếu mã khoản chi.');

    const lock = LockService.getScriptLock();
    lock.waitLock(10000);
    try {
      const sheet = getIndependentExpenseSheet_();
      const rows = readRows_(sheet);
      for (let i = 0; i < rows.length; i++) {
        if (String(rows[i][0]) === id) {
          sheet.deleteRow(i + 2);
          return { success: true, message: 'Đã xóa khoản chi riêng.' };
        }
      }
      throw new Error('Không tìm thấy khoản chi riêng cần xóa.');
    } finally {
      lock.releaseLock();
    }
  } catch (error) {
    console.error(error);
    return { success: false, message: error.message || String(error) };
  }
}

/* =========================
   TÍNH TỔNG
========================= */


/* =========================
   DASHBOARD
========================= */

function getDashboard(token) {
  try {
    requireAuth_(token);

    const sessionRows = readRows_(
      getSheet_(CONFIG.SHEETS.SESSIONS)
    );

    const routeRows = readRows_(
      getSheet_(CONFIG.SHEETS.ROUTES)
    );

    const expenseRows = readRows_(
      getSheet_(CONFIG.SHEETS.EXPENSES)
    );

    const independentExpenseRows = readRows_(
      getIndependentExpenseSheet_()
    );

    let totalCash = 0;
    let totalTransfer = 0;
    let totalExpense = 0;
    let totalIndependentExpense = 0;

    const independentExpenses = independentExpenseRows.map(row => {
      const date = normalizeDate_(row[1]);
      const purchaseDateTime = row[4] instanceof Date
        ? Utilities.formatDate(row[4], CONFIG.TIMEZONE, "yyyy-MM-dd'T'HH:mm")
        : String(row[4] || '');
      const amount = Number(row[3] || 0);
      totalIndependentExpense += amount;
      return {
        id: String(row[0]),
        date: date,
        content: String(row[2] || ''),
        amount: amount,
        purchaseDateTime: purchaseDateTime,
        note: String(row[5] || '')
      };
    });
    independentExpenses.sort((a, b) => b.date.localeCompare(a.date));

    const sessions = sessionRows.map(row => {
      const id = String(row[0]);
      const date = normalizeDate_(row[1]);

      const cash = Number(row[2] || 0);
      const transfer = Number(row[3] || 0);
      const income = Number(row[4] || 0);
      const expense = Number(row[5] || 0);
      const remaining = Number(row[6] || 0);

      totalCash += cash;
      totalTransfer += transfer;
      totalExpense += expense;

      const routes = routeRows
        .filter(item => String(item[1]) === id)
        .map(item => ({
          id: String(item[0]),
          name: String(item[3] || ''),
          cash: Number(item[4] || 0),
          transfer: Number(item[5] || 0),
          total: Number(item[6] || 0),
          note: String(item[7] || '')
        }));

      const expenses = expenseRows
        .filter(item => String(item[1]) === id)
        .map(item => ({
          id: String(item[0]),
          content: String(item[3] || ''),
          amount: Number(item[4] || 0),
          purchaseDateTime: item[5] instanceof Date
            ? Utilities.formatDate(
                item[5],
                CONFIG.TIMEZONE,
                "yyyy-MM-dd'T'HH:mm"
              )
            : String(item[5] || ''),
          note: String(item[6] || '')
        }));

      return {
        id: id,
        date: date,
        cash: cash,
        transfer: transfer,
        income: income,
        expense: expense,
        remaining: remaining,
        note: String(row[7] || ''),
        routes: routes,
        expenses: expenses
      };
    });

    sessions.sort((a, b) => b.date.localeCompare(a.date));

    return {
      success: true,
      totalCash: totalCash,
      totalTransfer: totalTransfer,
      totalIncome: totalCash + totalTransfer,
      totalExpense: totalExpense + totalIndependentExpense,
      totalSessionExpense: totalExpense,
      totalIndependentExpense: totalIndependentExpense,
      remaining: totalCash + totalTransfer - totalExpense - totalIndependentExpense,
      independentExpenses: independentExpenses,
      sessions: sessions
    };

  } catch (error) {
    console.error(error);

    return {
      success: false,
      message: error.message || String(error)
    };
  }
}

/* =========================
   XÓA KHOẢN CHI
========================= */

function deleteExpense(token, id) {
  try {
    requireAuth_(token);

    const sheet = getSheet_(CONFIG.SHEETS.EXPENSES);
    const rows = readRows_(sheet);

    for (let i = 0; i < rows.length; i++) {
      if (String(rows[i][0]) === String(id)) {
        const date = normalizeDate_(rows[i][2]);

        sheet.deleteRow(i + 2);
        updateSessionTotals_(date);

        return {
          success: true,
          message: 'Đã xóa khoản chi.'
        };
      }
    }

    throw new Error('Không tìm thấy khoản chi.');

  } catch (error) {
    return {
      success: false,
      message: error.message || String(error)
    };
  }
}