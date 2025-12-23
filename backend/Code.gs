// --- วิธีการติดตั้ง (Installation) - สำคัญมาก โปรดอ่าน! ---
// 1. ไปที่ Google Sheets -> Extensions -> Apps Script
// 2. ลบโค้ดเดิมใน Code.gs ออกให้หมด
// 3. คัดลอกโค้ดทั้งหมดในไฟล์นี้ไปวาง
// 4. กด Deploy (การทำให้ใช้งานได้) -> Manage Deployments (จัดการการทำให้ใช้งานได้)
// 5. กด Edit (ดินสอ) -> ตรง Version เลือก "New Version" (เวอร์ชันใหม่) !!! สำคัญมาก ต้องเลือกใหม่ทุกครั้งที่แก้โค้ด !!!
// 6. กด Deploy

function doGet(e) {
  return handleRequest(e);
}

function doPost(e) {
  return handleRequest(e);
}

function handleRequest(e) {
  var lock = LockService.getScriptLock();
  lock.tryLock(30000);

  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    
    // 1. Setup Sheets
    var usersSheet = ss.getSheetByName("Users");
    if (!usersSheet) {
      usersSheet = ss.insertSheet("Users");
      usersSheet.appendRow(["username", "password", "created_at", "api_key"]);
      usersSheet.appendRow(["admin", "1234", new Date(), ""]); 
    }

    var dataSheet = ss.getSheetByName("Data");
    if (!dataSheet) {
      dataSheet = ss.insertSheet("Data");
      dataSheet.appendRow(["id", "json_data", "updated_at", "username"]);
    }

    // 2. Parse Input
    var action = e.parameter.action;
    var payload = {};
    
    if (e.postData && e.postData.contents) {
      try {
        var jsonBody = JSON.parse(e.postData.contents);
        if (jsonBody.action) action = jsonBody.action;
        if (jsonBody.items) payload.items = jsonBody.items;
        if (jsonBody.username) payload.username = jsonBody.username;
        if (jsonBody.password) payload.password = jsonBody.password;
      } catch (err) { }
    }
    
    if (!payload.username && e.parameter.username) {
        payload.username = e.parameter.username;
    }

    var result = { success: false };

    // --- 3. Execute Logic ---
    
    if (action === 'login') {
      var data = usersSheet.getDataRange().getValues();
      var foundUser = null;
      for (var i = 1; i < data.length; i++) {
        var u = String(data[i][0]).trim();
        var p = String(data[i][1]).trim();
        var k = String(data[i][3] || "").trim(); // คอลัมน์ D คือ API Key
        
        if (u === String(payload.username).trim() && p === String(payload.password).trim()) {
          foundUser = { username: u, apiKey: k };
          break;
        }
      }
      result = { 
        success: foundUser !== null, 
        username: foundUser ? foundUser.username : null,
        apiKey: foundUser ? foundUser.apiKey : null 
      };
    } 
    
    else if (action === 'getProfile') {
      var data = usersSheet.getDataRange().getValues();
      var foundKey = "";
      var userToFind = String(payload.username).trim();
      for (var i = 1; i < data.length; i++) {
        if (String(data[i][0]).trim() === userToFind) {
          foundKey = String(data[i][3] || "").trim();
          result.success = true;
          break;
        }
      }
      result.apiKey = foundKey;
    }

    else if (action === 'save') {
      var currentUser = payload.username;
      if (!currentUser) throw new Error("Username is required.");
      
      var currentUserStr = String(currentUser).trim();
      var newItems = payload.items || [];
      var range = dataSheet.getDataRange();
      var allValues = range.getValues();
      var header = allValues[0];
      
      var otherUsersData = [];
      for (var i = 1; i < allValues.length; i++) {
          var row = allValues[i];
          if (String(row[3]).trim() !== currentUserStr) otherUsersData.push(row.slice(0, 4));
      }

      var newRows = newItems.map(function(item) {
        return [item.id, JSON.stringify(item), new Date(), currentUserStr];
      });

      var finalData = [header].concat(otherUsersData).concat(newRows);
      dataSheet.clear();
      if (finalData.length > 0) {
        dataSheet.getRange(1, 1, finalData.length, 4).setValues(finalData);
      }
      result = { success: true };
    } 
    
    else {
      var currentUser = payload.username;
      var items = [];
      if (currentUser) {
         var currentUserStr = String(currentUser).trim();
         var range = dataSheet.getDataRange();
         if (!range.isBlank()) {
             var rows = range.getValues();
             for (var i = 1; i < rows.length; i++) {
               var rowUser = rows[i][3];
               if (String(rowUser).trim() === currentUserStr) {
                    try { items.push(JSON.parse(rows[i][1])); } catch (e) { }
               }
             }
         }
      }
      result = { success: true, items: items };
    }

    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}