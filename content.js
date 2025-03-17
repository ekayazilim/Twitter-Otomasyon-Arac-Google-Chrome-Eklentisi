// Twitter Otomasyon Aracı - Content Script

// Interval IDs for all operations
let intervals = {
  liking: null,
  unliking: null,
  following: {
    main: null,
    scroll1: null,
    scroll2: null
  },
  unfollowing: {
    main: null,
    load: null
  },
  deletingTweets: null,
  muting: {
    main: null,
    load: null
  },
  liking_check_new_posts: null // "Yeni gönderiler var" kontrol aralığı
};

// Sayaçlar
let counters = {
  liking: 0,
  unliking: 0,
  following: 0,
  unfollowing: 0,
  deletingTweets: 0,
  muting: 0
};

// Mola durumu
let breakStatus = {
  isOnBreak: false,
  breakTimer: null,
  isRefreshing: false
};

// Varsayılan ayarlar
let defaultOptions = {
  actionInterval: 2000,
  breakInterval: 0,
  breakDuration: 60,
  longBreakInterval: 0,
  longBreakDuration: 900,
  refreshInterval: 0,
  refreshDelay: 30
};

// Listen for messages from the popup
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  console.log("Message received:", request.action);
  switch(request.action) {
    case "startLiking":
      startLiking(request.options || defaultOptions);
      break;
    case "stopLiking":
      stopLiking();
      break;
    case "startUnliking":
      startUnliking(request.options || defaultOptions);
      break;
    case "stopUnliking":
      stopUnliking();
      break;
    case "startFollowing":
      startFollowing(request.username, request.options || defaultOptions);
      break;
    case "stopFollowing":
      stopFollowing();
      break;
    case "startUnfollowing":
      startUnfollowing(request.options || defaultOptions);
      break;
    case "stopUnfollowing":
      stopUnfollowing();
      break;
    case "startDeletingTweets":
      startDeletingTweets(request.options || defaultOptions);
      break;
    case "stopDeletingTweets":
      stopDeletingTweets();
      break;
    case "startMuting":
      startMuting(request.options || defaultOptions);
      break;
    case "stopMuting":
      stopMuting();
      break;
    case "checkNonFollowers":
      checkNonFollowers(request.unfollowOption, request.options || defaultOptions);
      break;
  }
});

// Sayaç güncelleme
function updateCounter(type, count, total) {
  counters[type] = count;
  
  // Popup'a sayaç bilgisini gönder
  chrome.runtime.sendMessage({
    type: "counter",
    count: count,
    total: total || 0
  });
  
  console.log(`${type} işlemi sayacı: ${count}`);
}

// Mola kontrolü
function checkForBreak(type, options) {
  if (breakStatus.isOnBreak || breakStatus.isRefreshing) return true;
  
  const count = counters[type];
  
  // Sayfa yenileme kontrolü
  if (options.refreshInterval > 0 && count > 0 && count % options.refreshInterval === 0) {
    console.log(`${options.refreshInterval} işlem tamamlandı, sayfa yenileniyor...`);
    refreshPage(options.refreshDelay);
    return true;
  }
  
  // Kısa mola kontrolü
  if (options.breakInterval > 0 && count > 0 && count % options.breakInterval === 0) {
    console.log(`${options.breakInterval} işlem tamamlandı, ${options.breakDuration} saniyelik mola başlıyor...`);
    startBreak(options.breakDuration * 1000);
    return true;
  }
  
  // Uzun mola kontrolü
  if (options.longBreakInterval > 0 && count > 0 && count % options.longBreakInterval === 0) {
    console.log(`${options.longBreakInterval} işlem tamamlandı, ${options.longBreakDuration} saniyelik uzun mola başlıyor...`);
    startBreak(options.longBreakDuration * 1000);
    return true;
  }
  
  return false;
}

// Mola başlat
function startBreak(duration) {
  breakStatus.isOnBreak = true;
  
  // Mola süresi bitince isOnBreak'i false yap
  breakStatus.breakTimer = setTimeout(() => {
    breakStatus.isOnBreak = false;
    console.log("Mola bitti, işlemler devam ediyor...");
  }, duration);
}

// Sayfa yenileme
function refreshPage(delayInSeconds) {
  breakStatus.isRefreshing = true;
  
  // Kullanıcıya bilgi ver
  console.log("Sayfa yenileniyor...");
  
  // Sayfayı yenile
  location.reload();
  
  // Sayfa yenilendikten sonra çalışacak kod
  // Bu kısım çalışmayacak çünkü sayfa yenilendiğinde script de yeniden yüklenecek
  // Bu yüzden yenileme sonrası işlemleri localStorage ile yönetiyoruz
  
  // Yenileme zamanını ve işlem tipini kaydet
  const currentTime = new Date().getTime();
  const refreshData = {
    time: currentTime,
    delayInSeconds: delayInSeconds,
    activeOperation: getActiveOperation()
  };
  
  localStorage.setItem('twitterAutomationRefresh', JSON.stringify(refreshData));
}

// Aktif işlemi belirle
function getActiveOperation() {
  if (intervals.liking) return 'liking';
  if (intervals.unliking) return 'unliking';
  if (intervals.following.main) return 'following';
  if (intervals.unfollowing.main) return 'unfollowing';
  if (intervals.deletingTweets) return 'deletingTweets';
  if (intervals.muting.main) return 'muting';
  return null;
}

// Sayfa yüklendikten sonra yenileme kontrolü
document.addEventListener('DOMContentLoaded', function() {
  // Yenileme verisi var mı kontrol et
  const refreshDataStr = localStorage.getItem('twitterAutomationRefresh');
  if (refreshDataStr) {
    const refreshData = JSON.parse(refreshDataStr);
    const currentTime = new Date().getTime();
    const elapsedTime = (currentTime - refreshData.time) / 1000; // saniye cinsinden
    
    // Eğer yenileme yeni olduysa ve gecikme süresi henüz dolmadıysa
    if (elapsedTime < refreshData.delayInSeconds) {
      console.log(`Sayfa yenilendi. İşlemler ${refreshData.delayInSeconds - Math.floor(elapsedTime)} saniye sonra devam edecek...`);
      
      // Kalan süre kadar bekle ve sonra işlemi yeniden başlat
      setTimeout(() => {
        console.log("Yenileme sonrası bekleme süresi doldu, işlemler devam ediyor...");
        restartOperation(refreshData.activeOperation);
        // Yenileme verisini temizle
        localStorage.removeItem('twitterAutomationRefresh');
      }, (refreshData.delayInSeconds - elapsedTime) * 1000);
    } else {
      // Süre zaten dolmuş, hemen işlemi başlat
      console.log("Yenileme sonrası bekleme süresi dolmuş, işlemler hemen başlatılıyor...");
      restartOperation(refreshData.activeOperation);
      // Yenileme verisini temizle
      localStorage.removeItem('twitterAutomationRefresh');
    }
  }
});

// İşlemi yeniden başlat
function restartOperation(operationType) {
  if (!operationType) return;
  
  // Ayarları al
  chrome.storage.local.get('settings', function(data) {
    const options = data.settings || defaultOptions;
    
    switch(operationType) {
      case 'liking':
        startLiking(options);
        break;
      case 'unliking':
        startUnliking(options);
        break;
      case 'following':
        startFollowing("", options);
        break;
      case 'unfollowing':
        startUnfollowing(options);
        break;
      case 'deletingTweets':
        startDeletingTweets(options);
        break;
      case 'muting':
        startMuting(options);
        break;
    }
  });
}

// ==================== Beğeni İşlemleri ====================

// Otomatik beğeni başlat
function startLiking(options) {
  console.log("Beğeni başlatılıyor...", options);
  if (intervals.liking) return;
  
  // Sayacı sıfırla
  updateCounter("liking", 0);
  
  // İşlem durumunu bildirmek için bildirim gönder
  chrome.runtime.sendMessage({
    type: "status",
    message: "Otomatik beğeni başlatıldı. Başka sekmelerde çalışabilirsiniz."
  });
  
  // "Yeni gönderiler var" bildirimini kontrol etme aralığı
  intervals.liking_check_new_posts = setInterval(function() {
    // "Yeni gönderiler var" butonunu bul
    const newPostsButton = document.querySelector('button[aria-label="Yeni gönderiler var. Bu gönderilere gitmek için nokta tuşuna bas."]');
    
    if (newPostsButton) {
      console.log("Yeni gönderiler var butonu bulundu, tıklanıyor...");
      
      // Durum mesajı gönder
      chrome.runtime.sendMessage({
        type: "status",
        message: "Yeni gönderiler algılandı, en başa dönülüyor..."
      });
      
      // Butona tıkla
      newPostsButton.click();
      
      // Biraz bekleyerek sayfanın yüklenmesini sağla
      setTimeout(() => {
        console.log("Sayfa başına dönüldü, beğeni işlemine devam ediliyor...");
        
        // Durum mesajı gönder
        chrome.runtime.sendMessage({
          type: "status",
          message: `Sayfa başına dönüldü, beğeni işlemine devam ediliyor... (${counters.liking} tweet beğenildi)`
        });
      }, 1000);
    }
  }, 3000); // Her 3 saniyede bir kontrol et
  
  intervals.liking = setInterval(function() {
    // Mola kontrolü
    if (checkForBreak("liking", options)) {
      console.log("Mola nedeniyle beğeni işlemi bekletiliyor...");
      chrome.runtime.sendMessage({
        type: "status",
        message: "Mola nedeniyle beğeni işlemi bekletiliyor..."
      });
      return;
    }
    
    // Twitter'ın yeni arayüzünde beğeni butonu seçicisi
    const likeButtons = document.querySelectorAll('button[data-testid="like"]:not(.processed)');
    console.log("Bulunan beğeni butonları:", likeButtons.length);
    
    if (likeButtons.length > 0) {
      // İlk beğeni butonuna tıkla
      likeButtons[0].click();
      likeButtons[0].classList.add("processed");
      console.log("Beğeni butonu tıklandı");
      
      // Sayacı artır
      updateCounter("liking", counters.liking + 1);
      
      // Durum mesajı gönder
      chrome.runtime.sendMessage({
        type: "status",
        message: `${counters.liking} tweet beğenildi. Beğeni işlemi devam ediyor...`
      });
      
      // Beğeni işleminden sonra sayfayı aşağı kaydır
      setTimeout(() => {
        window.scrollBy(0, 300);
        console.log("Beğeni sonrası sayfa aşağı kaydırıldı");
      }, 500);
    } else {
      // Eğer beğeni butonu bulunamazsa sayfayı daha fazla aşağı kaydır
      window.scrollBy(0, 500);
      console.log("Beğeni butonu bulunamadı, sayfa aşağı kaydırıldı");
      
      // Durum mesajı gönder
      chrome.runtime.sendMessage({
        type: "status",
        message: `${counters.liking} tweet beğenildi. Daha fazla tweet aranıyor...`
      });
    }
  }, options.actionInterval);
}

// Beğeni durdur
function stopLiking() {
  console.log("Beğeni durduruluyor...");
  if (intervals.liking) {
    clearInterval(intervals.liking);
    intervals.liking = null;
    
    // "Yeni gönderiler var" kontrol aralığını da temizle
    if (intervals.liking_check_new_posts) {
      clearInterval(intervals.liking_check_new_posts);
      intervals.liking_check_new_posts = null;
    }
    
    console.log("Beğeni durduruldu");
    
    // Durum mesajı gönder
    chrome.runtime.sendMessage({
      type: "status",
      message: `Beğeni işlemi durduruldu. Toplam ${counters.liking} tweet beğenildi.`
    });
  }
}

// Beğenileri kaldır
function startUnliking(options) {
  console.log("Beğeni kaldırma başlatılıyor...", options);
  if (intervals.unliking) return;
  
  // Sayacı sıfırla
  updateCounter("unliking", 0);
  
  // İşlem durumunu bildirmek için bildirim gönder
  chrome.runtime.sendMessage({
    type: "status",
    message: "Beğeni kaldırma başlatıldı. Başka sekmelerde çalışabilirsiniz."
  });
  
  intervals.unliking = setInterval(function() {
    // Mola kontrolü
    if (checkForBreak("unliking", options)) {
      console.log("Mola nedeniyle beğeni kaldırma işlemi bekletiliyor...");
      chrome.runtime.sendMessage({
        type: "status",
        message: "Mola nedeniyle beğeni kaldırma işlemi bekletiliyor..."
      });
      return;
    }
    
    // Twitter'ın yeni arayüzünde beğeni kaldırma butonu seçicisi
    const unlikeButtons = document.querySelectorAll('button[data-testid="unlike"]:not(.processed)');
    console.log("Bulunan beğeni kaldırma butonları:", unlikeButtons.length);
    
    if (unlikeButtons.length > 0) {
      // İlk beğeni kaldırma butonuna tıkla
      unlikeButtons[0].click();
      unlikeButtons[0].classList.add("processed");
      console.log("Beğeni kaldırma butonu tıklandı");
      
      // Sayacı artır
      updateCounter("unliking", counters.unliking + 1);
      
      // Durum mesajı gönder
      chrome.runtime.sendMessage({
        type: "status",
        message: `${counters.unliking} tweet beğenisi kaldırıldı. İşlem devam ediyor...`
      });
      
      // Beğeni kaldırma işleminden sonra sayfayı aşağı kaydır
      setTimeout(() => {
        window.scrollBy(0, 300);
        console.log("Beğeni kaldırma sonrası sayfa aşağı kaydırıldı");
      }, 500);
    } else {
      // Eğer beğeni kaldırma butonu bulunamazsa sayfayı daha fazla aşağı kaydır
      window.scrollBy(0, 500);
      console.log("Beğeni kaldırma butonu bulunamadı, sayfa aşağı kaydırıldı");
      
      // Durum mesajı gönder
      chrome.runtime.sendMessage({
        type: "status",
        message: `${counters.unliking} tweet beğenisi kaldırıldı. Daha fazla tweet aranıyor...`
      });
    }
  }, options.actionInterval);
}

// Beğeni kaldırmayı durdur
function stopUnliking() {
  console.log("Beğeni kaldırma durduruluyor...");
  if (intervals.unliking) {
    clearInterval(intervals.unliking);
    intervals.unliking = null;
    console.log("Beğeni kaldırma durduruldu");
    
    // Durum mesajı gönder
    chrome.runtime.sendMessage({
      type: "status",
      message: `Beğeni kaldırma işlemi durduruldu. Toplam ${counters.unliking} tweet beğenisi kaldırıldı.`
    });
  }
}

// ==================== Takip İşlemleri ====================

// Geri takip başlat
function startFollowing(username, options) {
  console.log("Geri takip başlatılıyor...", username, options);
  stopFollowing(); // Önceki işlemi temizle
  
  // Sayacı sıfırla
  updateCounter("following", 0);
  
  let targetUsername = username || "";
  
  intervals.following.main = setInterval(function() {
    // Mola kontrolü
    if (checkForBreak("following", options)) {
      console.log("Mola nedeniyle takip işlemi bekletiliyor...");
      return;
    }
    
    // Hedef kullanıcıya ulaşılıp ulaşılmadığını kontrol et
    if (targetUsername) {
      const usernames = document.querySelectorAll('a[role="link"] span');
      for (const span of usernames) {
        if (span.textContent === targetUsername) {
          console.log(`Hedef kullanıcı bulundu: ${targetUsername}`);
          alert(`${targetUsername} kullanıcısına ulaşıldı. İşlem durduruluyor.`);
          stopFollowing();
          return;
        }
      }
    }
    
    // Takip butonlarını bul
    const followButtons = document.querySelectorAll('div[data-testid="follow"]:not(.processed)');
    console.log("Bulunan takip butonları:", followButtons.length);
    
    if (followButtons.length > 0) {
      // İlk takip butonuna tıkla
      followButtons[0].click();
      followButtons[0].classList.add("processed");
      console.log("Takip butonu tıklandı");
      
      // Sayacı artır
      updateCounter("following", counters.following + 1);
      
      // Sayfayı biraz aşağı kaydır
      setTimeout(() => {
        window.scrollBy(0, 200);
      }, 500);
    } else {
      // Eğer takip butonu bulunamazsa sayfayı daha fazla aşağı kaydır
      window.scrollBy(0, 500);
      console.log("Takip butonu bulunamadı, sayfa aşağı kaydırıldı");
    }
  }, options.actionInterval);
}

// Geri takip durdur
function stopFollowing() {
  console.log("Geri takip durduruluyor...");
  
  if (intervals.following.main) {
    clearInterval(intervals.following.main);
    intervals.following.main = null;
  }
  
  if (intervals.following.scroll1) {
    clearInterval(intervals.following.scroll1);
    intervals.following.scroll1 = null;
  }
  
  if (intervals.following.scroll2) {
    clearInterval(intervals.following.scroll2);
    intervals.following.scroll2 = null;
  }
  
  console.log("Geri takip durduruldu");
}

// Takipten çık
function startUnfollowing(options) {
  console.log("Takipten çıkma başlatılıyor...", options);
  stopUnfollowing(); // Önceki işlemi temizle
  
  // Sayacı sıfırla
  updateCounter("unfollowing", 0);
  
  intervals.unfollowing.main = setInterval(function() {
    // Mola kontrolü
    if (checkForBreak("unfollowing", options)) {
      console.log("Mola nedeniyle takipten çıkma işlemi bekletiliyor...");
      return;
    }
    
    // Takipten çıkma butonlarını bul
    const unfollowButtons = document.querySelectorAll('div[data-testid="unfollow"]:not(.processed)');
    console.log("Bulunan takipten çıkma butonları:", unfollowButtons.length);
    
    if (unfollowButtons.length > 0) {
      // İlk takipten çıkma butonuna tıkla
      unfollowButtons[0].click();
      unfollowButtons[0].classList.add("processed");
      console.log("Takipten çıkma butonu tıklandı");
      
      // Onay butonunu bekle ve tıkla
      setTimeout(() => {
        const confirmButtons = document.querySelectorAll('div[data-testid="confirmationSheetConfirm"]');
        if (confirmButtons.length > 0) {
          confirmButtons[0].click();
          console.log("Onay butonu tıklandı");
          
          // Sayacı artır
          updateCounter("unfollowing", counters.unfollowing + 1);
        }
      }, 1000);
      
      // Sayfayı biraz aşağı kaydır
      setTimeout(() => {
        window.scrollBy(0, 200);
      }, 1500);
    } else {
      // Eğer takipten çıkma butonu bulunamazsa sayfayı daha fazla aşağı kaydır
      window.scrollBy(0, 500);
      console.log("Takipten çıkma butonu bulunamadı, sayfa aşağı kaydırıldı");
    }
  }, options.actionInterval);
}

// Takipten çıkmayı durdur
function stopUnfollowing() {
  console.log("Takipten çıkma durduruluyor...");
  
  if (intervals.unfollowing.main) {
    clearInterval(intervals.unfollowing.main);
    intervals.unfollowing.main = null;
  }
  
  if (intervals.unfollowing.load) {
    clearInterval(intervals.unfollowing.load);
    intervals.unfollowing.load = null;
  }
  
  console.log("Takipten çıkma durduruldu");
}

// ==================== Tweet İşlemleri ====================

// Tweet silme
function startDeletingTweets(options) {
  console.log("Tweet silme başlatılıyor...", options);
  if (intervals.deletingTweets) return;
  
  // Sayacı sıfırla
  updateCounter("deletingTweets", 0);
  
  intervals.deletingTweets = setInterval(function() {
    // Mola kontrolü
    if (checkForBreak("deletingTweets", options)) {
      console.log("Mola nedeniyle tweet silme işlemi bekletiliyor...");
      return;
    }
    
    console.log("Tweet silme işlemi çalışıyor...");
    
    // Tweetleri bul
    const tweets = document.querySelectorAll('[data-testid="tweet"]:not(.processed)');
    console.log("Bulunan tweetler:", tweets.length);
    
    if (tweets.length > 0) {
      const tweet = tweets[0];
      tweet.classList.add("processed");
      
      // Tweet'in kendimize ait olup olmadığını kontrol et
      const tweetUsername = tweet.querySelector('a[role="link"] span');
      const myUsername = document.querySelector('a[data-testid="AppTabBar_Profile_Link"] span');
      
      if (tweetUsername && myUsername && tweetUsername.textContent === myUsername.textContent) {
        console.log("Kendimize ait tweet bulundu");
        
        // Tweet menü butonunu bul ve tıkla
        const menuButton = tweet.querySelector('div[data-testid="caret"]');
        if (menuButton) {
          console.log("Tweet menü butonu tıklanıyor");
          menuButton.click();
          
          // Silme butonunu bekle ve tıkla
          setTimeout(() => {
            const menuItems = document.querySelectorAll('div[role="menuitem"]');
            for (const item of menuItems) {
              if (item.textContent.includes("Sil") || item.textContent.includes("Delete")) {
                console.log("Tweet silme butonu tıklanıyor");
                item.click();
                
                // Onay butonunu bekle ve tıkla
                setTimeout(() => {
                  const confirmButtons = document.querySelectorAll('div[data-testid="confirmationSheetConfirm"]');
                  if (confirmButtons.length > 0) {
                    confirmButtons[0].click();
                    console.log("Onay butonu tıklandı");
                    
                    // Sayacı artır
                    updateCounter("deletingTweets", counters.deletingTweets + 1);
                  }
                }, 1000);
                
                break;
              }
            }
          }, 1000);
        } else {
          console.log("Tweet menü butonu bulunamadı");
        }
      } else {
        console.log("Bu tweet bize ait değil, atlanıyor");
      }
      
      // Sayfayı biraz aşağı kaydır
      setTimeout(() => {
        window.scrollBy(0, 300);
      }, 2000);
    } else {
      // Eğer tweet bulunamazsa sayfayı daha fazla aşağı kaydır
      window.scrollBy(0, 500);
      console.log("Tweet bulunamadı, sayfa aşağı kaydırıldı");
    }
  }, options.actionInterval * 2); // Tweet silme işlemi daha uzun sürdüğü için interval'i iki katına çıkarıyoruz
}

// Tweet silmeyi durdur
function stopDeletingTweets() {
  console.log("Tweet silme durduruluyor...");
  if (intervals.deletingTweets) {
    clearInterval(intervals.deletingTweets);
    intervals.deletingTweets = null;
    console.log("Tweet silme durduruldu");
  }
}

// ==================== Sessiz Alma İşlemleri ====================

// Sessiz alma başlat
function startMuting(options) {
  console.log("Sessiz alma başlatılıyor...", options);
  stopMuting(); // Önceki işlemi temizle
  
  // Sayacı sıfırla
  updateCounter("muting", 0);
  
  intervals.muting.main = setInterval(function() {
    // Mola kontrolü
    if (checkForBreak("muting", options)) {
      console.log("Mola nedeniyle sessiz alma işlemi bekletiliyor...");
      return;
    }
    
    // Kullanıcı menü butonlarını bul
    const userMenuButtons = document.querySelectorAll('div[data-testid="userActions"]:not(.processed)');
    console.log("Bulunan kullanıcı menü butonları:", userMenuButtons.length);
    
    if (userMenuButtons.length > 0) {
      // İlk kullanıcı menü butonuna tıkla
      userMenuButtons[0].click();
      userMenuButtons[0].classList.add("processed");
      console.log("Kullanıcı menü butonu tıklandı");
      
      // Sessiz alma butonunu bekle ve tıkla
      setTimeout(() => {
        const menuItems = document.querySelectorAll('div[role="menuitem"]');
        for (const item of menuItems) {
          if (item.textContent.includes("Sessiz al") || item.textContent.includes("Mute")) {
            console.log("Sessiz alma butonu tıklanıyor");
            item.click();
            
            // Sayacı artır
            updateCounter("muting", counters.muting + 1);
            break;
          }
        }
      }, 1000);
      
      // Sayfayı biraz aşağı kaydır
      setTimeout(() => {
        window.scrollBy(0, 200);
      }, 1500);
    } else {
      // Eğer kullanıcı menü butonu bulunamazsa sayfayı daha fazla aşağı kaydır
      window.scrollBy(0, 500);
      console.log("Kullanıcı menü butonu bulunamadı, sayfa aşağı kaydırıldı");
    }
  }, options.actionInterval);
}

// Sessiz almayı durdur
function stopMuting() {
  console.log("Sessiz alma durduruluyor...");
  
  if (intervals.muting.main) {
    clearInterval(intervals.muting.main);
    intervals.muting.main = null;
  }
  
  if (intervals.muting.load) {
    clearInterval(intervals.muting.load);
    intervals.muting.load = null;
  }
  
  console.log("Sessiz alma durduruldu");
}

// ==================== Takip Etmeyenleri Bulma İşlemleri ====================

// Takip etmeyen kullanıcıları bulma ve listeleme
function checkNonFollowers(unfollowOption, options) {
  console.log("Takip etmeyenleri bulma başlatılıyor...", options);
  
  // Kullanıcının takip edilenler sayfasında olup olmadığını kontrol et
  if (!window.location.href.includes("/following")) {
    alert("Bu özelliği kullanmak için takip edilenler sayfasında olmalısınız. Örneğin: https://x.com/kullaniciadi/following");
    return;
  }
  
  // Takip etmeyen kullanıcıları saklamak için dizi
  let nonFollowers = [];
  
  // İşlem durumunu bildirmek için bildirim gönder
  chrome.runtime.sendMessage({
    type: "status",
    message: "Takip etmeyenler bulunuyor... Başka sekmelerde çalışabilirsiniz."
  });
  
  // Takip edilenleri ve takip etmeyenleri bul
  collectFollowingStatus(options).then(nonFollowersList => {
    nonFollowers = nonFollowersList;
    
    // İşlem tamamlandı bildirimini gönder
    chrome.runtime.sendMessage({
      type: "status",
      message: `${nonFollowers.length} takip etmeyen kullanıcı bulundu. Sonuçları görmek için bu sekmeye dönün.`
    });
    
    // Takip etmeyenleri göster
    displayNonFollowers();
  }).catch(error => {
    console.error("Takip etmeyenleri bulma hatası:", error);
    alert("Takip etmeyenleri bulma sırasında bir hata oluştu: " + error.message);
  });
  
  // Takip edilenleri toplama ve takip etmeyenleri bulma fonksiyonu
  async function collectFollowingStatus(options) {
    console.log("Takip edilenler ve takip durumları toplanıyor...");
    
    // Takip etmeyenleri saklamak için dizi
    let nonFollowersList = [];
    
    // Mevcut sayfadaki takip edilen kullanıcıları al
    processCurrentFollowingPage();
    
    // Daha fazla takip edilen yüklemek için sayfayı aşağı kaydır
    let lastSize = nonFollowersList.length;
    let noChangeCount = 0;
    let totalProcessed = 0;
    
    // Belirli bir sayıda takip edilen toplanana kadar veya yeni takip edilen bulunamazsa devam et
    while (noChangeCount < 3) {
      // Sayfayı aşağı kaydır
      window.scrollTo(0, document.body.scrollHeight);
      
      // Yeni içeriğin yüklenmesi için bekle
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Yeni takip edilenleri işle
      const newProcessed = processCurrentFollowingPage();
      totalProcessed += newProcessed;
      
      // Yeni takip etmeyen eklenip eklenmediğini kontrol et
      if (nonFollowersList.length === lastSize) {
        noChangeCount++;
      } else {
        noChangeCount = 0;
        lastSize = nonFollowersList.length;
      }
      
      // İlerleme durumunu bildir
      chrome.runtime.sendMessage({
        type: "status",
        message: `${nonFollowersList.length} takip etmeyen kullanıcı bulundu. (${totalProcessed} kullanıcı kontrol edildi)`
      });
      
      console.log(`${nonFollowersList.length} takip etmeyen kullanıcı bulundu. (${totalProcessed} kullanıcı kontrol edildi)`);
    }
    
    console.log("Takip etmeyenler toplama tamamlandı.");
    return nonFollowersList;
    
    // Mevcut sayfadaki takip edilenleri işle
    function processCurrentFollowingPage() {
      // Twitter'ın güncel HTML yapısına göre kullanıcı hücrelerini seç
      const userCells = document.querySelectorAll('button[data-testid="UserCell"]');
      let processedCount = 0;
      
      userCells.forEach(cell => {
        try {
          // Kullanıcı adını al
          const usernameElement = cell.querySelector('div[dir="ltr"] span span');
          if (!usernameElement) return;
          
          const username = usernameElement.textContent.trim();
          const handle = cell.querySelector('div[dir="ltr"][class*="r-1wvb978"] span')?.textContent.trim() || '';
          
          // "Takip ediliyor" butonunu bul
          const followButton = cell.parentElement.parentElement.querySelector('button[data-testid$="-unfollow"]');
          const userId = followButton ? followButton.getAttribute('data-testid').split('-')[0] : '';
          
          // "Seni takip ediyor" yazısını ara
          // Twitter'ın güncel yapısında bu bilgi genellikle bulunmaz, bu yüzden
          // kullanıcı profilinde "Seni takip ediyor" yazısının olup olmadığını kontrol etmemiz gerekiyor
          const followsYouText = cell.textContent.includes("Seni takip ediyor");
          
          // Eğer "Seni takip ediyor" yazısı yoksa, bu kullanıcı seni takip etmiyor olabilir
          if (!followsYouText) {
            // Kullanıcı zaten listeye eklenmemiş ise ekle
            if (!nonFollowersList.some(user => user.username === username || user.handle === handle)) {
              nonFollowersList.push({
                username: username,
                handle: handle,
                userId: userId,
                profileUrl: `https://x.com/${handle.replace('@', '')}`
              });
            }
          }
          
          processedCount++;
        } catch (error) {
          console.error("Kullanıcı işleme hatası:", error);
        }
      });
      
      return processedCount;
    }
  }
  
  // Takip etmeyenleri gösterme fonksiyonu
  function displayNonFollowers() {
    console.log("Takip etmeyenler gösteriliyor...");
    
    // Mevcut içeriği temizle
    const mainElement = document.querySelector('main[role="main"]');
    if (!mainElement) return;
    
    // Orijinal içeriği sakla
    const originalContent = mainElement.innerHTML;
    
    // Yeni içerik oluştur
    let newContent = `
      <div style="padding: 20px; color: white;">
        <h2>Sizi Takip Etmeyen Kullanıcılar (${nonFollowers.length})</h2>
        <button id="backToTwitter" style="padding: 10px; margin-bottom: 20px; background-color: #1DA1F2; color: white; border: none; border-radius: 20px; cursor: pointer;">Twitter'a Geri Dön</button>
        <div style="display: flex; margin-bottom: 10px;">
          <input type="text" id="searchNonFollowers" placeholder="Kullanıcı ara..." style="padding: 8px; border-radius: 20px; border: 1px solid #333; background-color: #000; color: white; flex-grow: 1;">
        </div>
        <div style="max-height: 500px; overflow-y: auto;">
          <ul id="nonFollowersList" style="list-style-type: none; padding: 0;">
    `;
    
    // Takip etmeyen her kullanıcı için liste öğesi ekle
    nonFollowers.forEach(user => {
      newContent += `
        <li style="padding: 10px; margin-bottom: 10px; border-bottom: 1px solid #333; display: flex; justify-content: space-between; align-items: center;">
          <div>
            <a href="${user.profileUrl}" target="_blank" style="color: #1DA1F2; text-decoration: none; font-weight: bold;">${user.username}</a>
            <span style="color: #71767b; margin-left: 5px;">${user.handle}</span>
          </div>
          <a href="${user.profileUrl}" target="_blank" style="padding: 5px 10px; background-color: #1DA1F2; color: white; border: none; border-radius: 20px; text-decoration: none;">Profili Görüntüle</a>
        </li>
      `;
    });
    
    newContent += `
          </ul>
        </div>
      </div>
    `;
    
    // Yeni içeriği ekle
    mainElement.innerHTML = newContent;
    
    // Twitter'a geri dönme butonu için olay dinleyicisi ekle
    document.getElementById('backToTwitter').addEventListener('click', function() {
      mainElement.innerHTML = originalContent;
    });
    
    // Arama işlevi ekle
    document.getElementById('searchNonFollowers').addEventListener('input', function() {
      const searchText = this.value.toLowerCase();
      const listItems = document.querySelectorAll('#nonFollowersList li');
      
      listItems.forEach(item => {
        const username = item.textContent.toLowerCase();
        if (username.includes(searchText)) {
          item.style.display = 'flex';
        } else {
          item.style.display = 'none';
        }
      });
    });
  }
}
