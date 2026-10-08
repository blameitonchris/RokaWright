/* ES5 controls. Feature-detect offline capabilities; never imply persistent storage is guaranteed. */
(function () {
  var status = document.getElementById('offline-status');
  var prepare = document.getElementById('offline-prepare');
  var check = document.getElementById('offline-check');
  var apply = document.getElementById('offline-update');
  var connection = document.getElementById('offline-connection');
  var registration, applying = false, updateDialog, updateTimer, preparationStarted = false;
  var scopeURL = new URL('./', location.href).href;
  function say(text) { status.textContent = text; }
  function linked() { connection.textContent = navigator.onLine === false ? 'Browser reports offline.' : 'Browser reports online (connection not verified).'; }
  function storageWorks() {
    if (!window.RokaWorkroom || !RokaWorkroom.storageReadable()) throw Error('The workroom or saved records could not be read. Back up and resolve the storage warning first.');
    var probe = window.ROKA_STORAGE_KEY + '.offline-write-check';
    try {
      localStorage.setItem(probe, 'ok');
      if (localStorage.getItem(probe) !== 'ok') throw Error('Storage check failed.');
    } finally { localStorage.removeItem(probe); }
  }
  function message(worker, type) {
    return new Promise(function (resolve, reject) {
      if (!worker || worker.scriptURL.split('?')[0] !== scopeURL + 'offline-worker.js') return reject(Error('No prepared offline test app is active yet.'));
      var channel = new MessageChannel();
      var timer = setTimeout(function () { channel.port1.close(); reject(Error('Offline verification timed out. Reconnect and try Prepare again.')); }, 15000);
      channel.port1.onmessage = function (event) { clearTimeout(timer); channel.port1.close(); resolve(event.data); };
      worker.postMessage({type:type}, [channel.port2]);
    });
  }
  function updates() { apply.hidden = !(registration && registration.waiting); }
  function verify() {
    linked(); updates(); say('Checking cached app and saved-record storage…');
    try { storageWorks(); } catch (e) { say('Not ready for offline use: ' + e.message); return Promise.resolve(false); }
    var worker = navigator.serviceWorker.controller;
    return message(worker, 'STATUS').then(function (result) {
      if (!result.ready) throw Error(result.error || 'The offline cache is incomplete.');
      if (result.release !== window.ROKA_OFFLINE_RELEASE) throw Error('The open page and offline release differ. Save your work, close this test tab, and reopen its bookmarked link.');
      say('Ready for offline use. App assets verified and storage writable. Save work before closing. Test airplane mode and a tablet restart before relying on this device.');
      prepare.textContent = 'Prepare / check for updates'; return true;
    }).catch(function (error) { say('Not ready for offline use: ' + error.message); return false; });
  }
  function watch(reg) {
    registration = reg; updates();
    reg.onupdatefound = function () {
      var worker = reg.installing;
      if (!worker) return;
      worker.onstatechange = function () {
        if (worker.state === 'installed') {
          updates();
          if (reg.waiting && navigator.serviceWorker.controller) say('Update downloaded. Your current prepared app still works offline. Save unfinished work and back up before applying it.');
          else setTimeout(verify, 100);
        }
        if (worker.state === 'redundant') say('Offline preparation or update failed. Reconnect, check free space, and retry. Any previously prepared release and saved records are retained.');
      };
    };
    if (reg.installing) reg.onupdatefound();
  }
  var supported = location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1';
  supported = supported && navigator.serviceWorker && typeof navigator.serviceWorker.register === 'function' && window.caches && window.fetch && window.MessageChannel && window.crypto && crypto.subtle;
  linked();
  if (!supported) {
    say('Browser-based offline use is unavailable here. This app still works online. Try the tablet’s full Chrome browser (not Opera Mini/data-saving mode). If neither browser can prepare it, a separately tested Android 4.2.2 app is needed. A downloaded webpage alone is not a reliable substitute.');
    prepare.disabled = true; check.disabled = true; apply.hidden = true; return;
  }
  navigator.serviceWorker.addEventListener('controllerchange', function () {
    if (applying) {clearTimeout(updateTimer);location.reload();} else verify();
  });
  navigator.serviceWorker.getRegistration('./').then(function (reg) {
    if (preparationStarted) return;
    if (reg && reg.scope === scopeURL) { watch(reg); verify(); } else say('Not prepared for offline use. Connect to the internet and choose Prepare for offline use.');
  }).catch(function (error) {say('Not ready for offline use: ' + error.message);});
  prepare.onclick = function () {
    preparationStarted = true;
    try {storageWorks();} catch(e) {say('Not ready for offline use: '+e.message);return;}
    prepare.disabled = true; say('Preparing verified offline assets. Keep this page open and connected…');
    navigator.serviceWorker.register('./offline-worker.js', {scope:'./'}).then(function (reg) {
      watch(reg);
      if (reg.active) return reg.update().then(function () {updates();if (!reg.installing && !reg.waiting) return message(reg.active,'REPAIR').then(function(result){if(!result.ready)throw Error(result.error);return verify();});});
    }).catch(function (error) {say('Preparation failed: '+error.message+'. Reconnect and retry; existing records are unchanged.');}).then(function () {prepare.disabled=false;});
  };
  check.onclick = verify;
  apply.onclick = function () {
    if (RokaWorkroom.hasUnsavedChanges()) {say('Save or close unfinished job, sale, customer or stock edits before updating. Nothing has been reloaded.');return;}
    RokaWorkroom.confirm('Have you saved all work, made a private backup, and closed other offline-test tabs? Apply the prepared update and reload this test app? Saved records stay on this device.').then(function (yes) {
      if (!yes) return;
      if (RokaWorkroom.hasUnsavedChanges()) {say('Save unfinished work before updating.');return;}
      updateDialog = document.createElement('dialog'); updateDialog.innerHTML='<h2>Applying prepared update…</h2><p>Saved records stay on this device. Please wait.</p>';
      document.body.appendChild(updateDialog);RokaCompat.showDialog(updateDialog);
      updateDialog.oncancel=function(event){event.preventDefault();};applying=true;
      updateTimer=setTimeout(function(){
        if (!applying) return;
        applying=false;RokaCompat.closeDialog(updateDialog);updateDialog.remove();
        say('Update did not finish in time. No records were deleted. Reconnect and check readiness; save work before closing and reopening the test app.');
      },20000);
      message(registration.waiting,'APPLY_UPDATE').then(function(result){if(!result.accepted)throw Error(result.error);}).catch(function(error){
        clearTimeout(updateTimer);applying=false;RokaCompat.closeDialog(updateDialog);updateDialog.remove();say('Update not applied: '+error.message);
      });
    });
  };
  window.addEventListener('online', linked); window.addEventListener('offline', linked);
  window.addEventListener('beforeunload', function(event) {
    if (!applying && window.RokaWorkroom && RokaWorkroom.hasUnsavedChanges()) {event.preventDefault();event.returnValue='Save unfinished work before closing.';}
  });
})();
