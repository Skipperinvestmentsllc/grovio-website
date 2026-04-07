// grovio waitlist modal — shared across all pages
// Posts to waitlist-subscribe Edge Function (Kit API secret stays server-side)
(function(){
  var done=false, open=false;

  // Inject modal HTML
  var div=document.createElement('div');
  div.id='wl-overlay';
  div.setAttribute('style','display:none;position:fixed;inset:0;z-index:9999;background:rgba(44,34,24,0.5);backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px);align-items:center;justify-content:center;padding:24px;');
  div.innerHTML=
    '<div id="wl-card" style="background:#FCFAF8;border-radius:20px;max-width:420px;width:100%;padding:36px 32px;position:relative;box-shadow:0 8px 40px rgba(44,34,24,0.15);animation:wlFadeUp 0.3s ease both;">'+
      '<button id="wl-close" style="position:absolute;top:14px;right:16px;background:none;border:none;cursor:pointer;font-size:20px;color:#A89A8A;line-height:1;padding:4px;">&times;</button>'+
      '<div id="wl-content">'+
        '<div style="font-family:Nunito,sans-serif;font-weight:800;font-size:18px;color:#4A6E4E;margin-bottom:16px;letter-spacing:-0.01em;">grovio</div>'+
        '<div style="font-family:Inter,sans-serif;font-weight:600;font-size:22px;color:#2C2218;margin-bottom:8px;line-height:1.3;">Be the first to know</div>'+
        '<p style="font-family:Inter,sans-serif;font-size:14px;color:#7A6A5A;line-height:1.6;margin:0 0 24px;">grovio is almost ready. Drop your email and we\'ll notify you the moment it launches.</p>'+
        '<input id="wl-email" type="email" inputmode="email" autocomplete="email" placeholder="your@email.com" style="width:100%;padding:12px 16px;border:1px solid #B8D4BB;border-radius:10px;font-family:Inter,sans-serif;font-size:16px;color:#2C2218;background:#FCFAF8;outline:none;box-sizing:border-box;margin-bottom:10px;-webkit-appearance:none;">'+
        '<button id="wl-btn" style="width:100%;padding:12px;background:#4A6E4E;color:#F7F4EE;border:none;border-radius:10px;font-family:Inter,sans-serif;font-size:15px;font-weight:600;cursor:pointer;transition:background 0.15s;">Notify me</button>'+
        '<div id="wl-msg" style="display:none;margin-top:10px;font-family:Inter,sans-serif;font-size:13px;line-height:1.4;text-align:center;"></div>'+
      '</div>'+
    '</div>';
  document.body.appendChild(div);

  // Inject keyframe animation
  var style=document.createElement('style');
  style.textContent='@keyframes wlFadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}';
  document.head.appendChild(style);

  // Refs
  var overlay=document.getElementById('wl-overlay');
  var card=document.getElementById('wl-card');
  var closeBtn=document.getElementById('wl-close');
  var emailInput=document.getElementById('wl-email');
  var submitBtn=document.getElementById('wl-btn');
  var msgEl=document.getElementById('wl-msg');
  var contentEl=document.getElementById('wl-content');

  function openModal(){
    if(done){
      // Already subscribed — show confirmation
      overlay.style.display='flex';
      open=true;
      return;
    }
    overlay.style.display='flex';
    open=true;
    setTimeout(function(){ emailInput && emailInput.focus(); },200);
  }

  function closeModal(){
    overlay.style.display='none';
    open=false;
  }

  // Close on overlay click (not card)
  overlay.addEventListener('click',function(e){
    if(e.target===overlay) closeModal();
  });
  card.addEventListener('click',function(e){ e.stopPropagation(); });
  closeBtn.addEventListener('click', closeModal);

  // Close on Escape
  document.addEventListener('keydown',function(e){
    if(e.key==='Escape' && open) closeModal();
  });

  // Submit
  submitBtn.addEventListener('click',function(){
    var email=(emailInput.value||'').trim();
    if(!email || email.indexOf('@')<1) {
      emailInput.style.borderColor='#C4843A';
      return;
    }
    emailInput.style.borderColor='#B8D4BB';
    submitBtn.textContent='Sending...';
    submitBtn.disabled=true;
    msgEl.style.display='none';

    fetch('https://trqqcvevrfuijjxsqqlt.supabase.co/functions/v1/waitlist-subscribe',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({email:email})
    })
    .then(function(r){ return r.json(); })
    .then(function(d){
      if(d.ok){
        done=true;
        contentEl.innerHTML=
          '<div style="text-align:center;padding:20px 0;">'+
            '<div style="font-size:28px;margin-bottom:12px;">🌿</div>'+
            '<div style="font-family:Inter,sans-serif;font-weight:600;font-size:18px;color:#2C2218;margin-bottom:8px;">You\'re on the list.</div>'+
            '<div style="font-family:Inter,sans-serif;font-size:14px;color:#7A6A5A;">We\'ll be in touch.</div>'+
          '</div>';
        setTimeout(closeModal, 2500);
      } else {
        throw new Error();
      }
    })
    .catch(function(){
      msgEl.style.display='block';
      msgEl.style.color='#C4843A';
      msgEl.textContent='Something went wrong \u2014 try again.';
      submitBtn.textContent='Notify me';
      submitBtn.disabled=false;
    });
  });

  // Enter key submits
  emailInput.addEventListener('keydown',function(e){
    if(e.key==='Enter') submitBtn.click();
  });

  // Expose global function
  window.openWaitlistModal=openModal;
})();
