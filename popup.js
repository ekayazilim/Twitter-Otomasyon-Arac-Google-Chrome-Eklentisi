document.addEventListener('DOMContentLoaded', function() {
  // Ayarlar
  let settings = {
    actionInterval: 2000,
    breakInterval: 0,
    breakDuration: 60,
    longBreakInterval: 0,
    longBreakDuration: 900,
    refreshInterval: 0,
    refreshDelay: 30
  };

  // Ayarları yükle
  loadSettings();

  // Ayar değişikliklerini dinle
  document.getElementById('actionInterval').addEventListener('change', saveSettings);
  document.getElementById('breakInterval').addEventListener('change', saveSettings);
  document.getElementById('breakDuration').addEventListener('change', saveSettings);
  document.getElementById('longBreakInterval').addEventListener('change', saveSettings);
  document.getElementById('longBreakDuration').addEventListener('change', saveSettings);
  document.getElementById('refreshInterval').addEventListener('change', saveSettings);
  document.getElementById('refreshDelay').addEventListener('change', saveSettings);

  // Beğeni işlemleri
  document.getElementById('startLiking').addEventListener('click', function() {
    const options = getOptions();
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      chrome.tabs.sendMessage(tabs[0].id, {
        action: "startLiking",
        options: options
      });
      updateStatus("Otomatik beğeni başlatıldı");
      console.log("Beğeni başlatma mesajı gönderildi", options);
    });
  });

  document.getElementById('stopLiking').addEventListener('click', function() {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      chrome.tabs.sendMessage(tabs[0].id, {action: "stopLiking"});
      updateStatus("Otomatik beğeni durduruldu");
      console.log("Beğeni durdurma mesajı gönderildi");
    });
  });

  document.getElementById('startUnliking').addEventListener('click', function() {
    const options = getOptions();
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      chrome.tabs.sendMessage(tabs[0].id, {
        action: "startUnliking",
        options: options
      });
      updateStatus("Beğeni kaldırma başlatıldı");
      console.log("Beğeni kaldırma başlatma mesajı gönderildi", options);
    });
  });

  document.getElementById('stopUnliking').addEventListener('click', function() {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      chrome.tabs.sendMessage(tabs[0].id, {action: "stopUnliking"});
      updateStatus("Beğeni kaldırma durduruldu");
      console.log("Beğeni kaldırma durdurma mesajı gönderildi");
    });
  });

  // Takip işlemleri
  document.getElementById('startFollowing').addEventListener('click', function() {
    const followUntilUser = document.getElementById('followUntilUser').value;
    const options = getOptions();
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      chrome.tabs.sendMessage(tabs[0].id, {
        action: "startFollowing",
        username: followUntilUser,
        options: options
      });
      updateStatus("Geri takip başlatıldı" + (followUntilUser ? ` (${followUntilUser} kullanıcısına kadar)` : ""));
      console.log("Geri takip başlatma mesajı gönderildi", followUntilUser, options);
    });
  });

  document.getElementById('stopFollowing').addEventListener('click', function() {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      chrome.tabs.sendMessage(tabs[0].id, {action: "stopFollowing"});
      updateStatus("Geri takip durduruldu");
      console.log("Geri takip durdurma mesajı gönderildi");
    });
  });

  document.getElementById('startUnfollowing').addEventListener('click', function() {
    const options = getOptions();
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      chrome.tabs.sendMessage(tabs[0].id, {
        action: "startUnfollowing",
        options: options
      });
      updateStatus("Takipten çıkma başlatıldı");
      console.log("Takipten çıkma başlatma mesajı gönderildi", options);
    });
  });

  document.getElementById('stopUnfollowing').addEventListener('click', function() {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      chrome.tabs.sendMessage(tabs[0].id, {action: "stopUnfollowing"});
      updateStatus("Takipten çıkma durduruldu");
      console.log("Takipten çıkma durdurma mesajı gönderildi");
    });
  });

  document.getElementById('startNonFollowersCheck').addEventListener('click', function() {
    const options = getOptions();
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      chrome.tabs.sendMessage(tabs[0].id, {
        action: "checkNonFollowers",
        options: options
      });
      
      updateStatus("Takip etmeyenleri listeleme başlatıldı");
      console.log("Takip etmeyenleri bulma mesajı gönderildi", options);
    });
  });

  // Tweet işlemleri
  document.getElementById('startDeletingTweets').addEventListener('click', function() {
    const options = getOptions();
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      chrome.tabs.sendMessage(tabs[0].id, {
        action: "startDeletingTweets",
        options: options
      });
      updateStatus("Tweet silme başlatıldı");
      console.log("Tweet silme başlatma mesajı gönderildi", options);
    });
  });

  document.getElementById('stopDeletingTweets').addEventListener('click', function() {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      chrome.tabs.sendMessage(tabs[0].id, {action: "stopDeletingTweets"});
      updateStatus("Tweet silme durduruldu");
      console.log("Tweet silme durdurma mesajı gönderildi");
    });
  });

  // Sessiz alma işlemleri
  document.getElementById('startMuting').addEventListener('click', function() {
    const options = getOptions();
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      chrome.tabs.sendMessage(tabs[0].id, {
        action: "startMuting",
        options: options
      });
      updateStatus("Sessiz alma başlatıldı");
      console.log("Sessiz alma başlatma mesajı gönderildi", options);
    });
  });

  document.getElementById('stopMuting').addEventListener('click', function() {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      chrome.tabs.sendMessage(tabs[0].id, {action: "stopMuting"});
      updateStatus("Sessiz alma durduruldu");
      console.log("Sessiz alma durdurma mesajı gönderildi");
    });
  });

  // Durum mesajını güncelle
  function updateStatus(message) {
    document.getElementById('statusMessage').textContent = "Durum: " + message;
  }

  // Sayaç mesajını güncelle
  function updateCounter(count, total) {
    if (count && total) {
      document.getElementById('counterMessage').textContent = `İşlem: ${count}/${total}`;
    } else {
      document.getElementById('counterMessage').textContent = "";
    }
  }

  // Ayarları kaydet
  function saveSettings() {
    settings = {
      actionInterval: parseInt(document.getElementById('actionInterval').value),
      breakInterval: parseInt(document.getElementById('breakInterval').value),
      breakDuration: parseInt(document.getElementById('breakDuration').value),
      longBreakInterval: parseInt(document.getElementById('longBreakInterval').value),
      longBreakDuration: parseInt(document.getElementById('longBreakDuration').value),
      refreshInterval: parseInt(document.getElementById('refreshInterval').value),
      refreshDelay: parseInt(document.getElementById('refreshDelay').value)
    };
    
    chrome.storage.local.set({settings: settings}, function() {
      console.log('Ayarlar kaydedildi:', settings);
    });
  }

  // Ayarları yükle
  function loadSettings() {
    chrome.storage.local.get('settings', function(data) {
      if (data.settings) {
        settings = data.settings;
        document.getElementById('actionInterval').value = settings.actionInterval;
        document.getElementById('breakInterval').value = settings.breakInterval;
        document.getElementById('breakDuration').value = settings.breakDuration;
        document.getElementById('longBreakInterval').value = settings.longBreakInterval;
        document.getElementById('longBreakDuration').value = settings.longBreakDuration;
        
        // Yeni eklenen ayarlar için kontrol
        if (settings.refreshInterval !== undefined) {
          document.getElementById('refreshInterval').value = settings.refreshInterval;
        }
        if (settings.refreshDelay !== undefined) {
          document.getElementById('refreshDelay').value = settings.refreshDelay;
        }
        
        console.log('Ayarlar yüklendi:', settings);
      }
    });
  }

  // Seçenekleri al
  function getOptions() {
    return {
      actionInterval: parseInt(document.getElementById('actionInterval').value),
      breakInterval: parseInt(document.getElementById('breakInterval').value),
      breakDuration: parseInt(document.getElementById('breakDuration').value),
      longBreakInterval: parseInt(document.getElementById('longBreakInterval').value),
      longBreakDuration: parseInt(document.getElementById('longBreakDuration').value),
      refreshInterval: parseInt(document.getElementById('refreshInterval').value),
      refreshDelay: parseInt(document.getElementById('refreshDelay').value)
    };
  }

  // Eklenti açıldığında Twitter'da olup olmadığımızı kontrol et
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    const url = tabs[0].url;
    console.log("Mevcut URL:", url);
    if (!url.includes('twitter.com') && !url.includes('x.com')) {
      updateStatus("Bu eklenti sadece Twitter'da çalışır");
      disableAllButtons();
      console.log("Twitter dışında bir sayfada olduğu için butonlar devre dışı bırakıldı");
    } else {
      console.log("Twitter sayfasında, eklenti aktif");
    }
  });

  function disableAllButtons() {
    const buttons = document.querySelectorAll('.action-button');
    buttons.forEach(button => {
      button.disabled = true;
      button.style.backgroundColor = '#ccc';
      button.style.cursor = 'not-allowed';
    });
  }

  // İşlem sayacını ve durum mesajlarını dinle
  chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.type === "counter") {
      updateCounter(request.count, request.total);
    } else if (request.type === "status") {
      updateStatus(request.message);
    }
  });
});
