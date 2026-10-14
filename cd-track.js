/* =====================================================================
   CrypToday Landing Page Tracker
   Satu file untuk semua LP. Kirim event ke Meta Pixel + Google Analytics 4.

   Event yang dikirim:
     - scroll_depth     : 25 / 50 / 75 / 90 / 100 %
     - section_view     : section yang benar-benar dilihat (ada di tengah layar min. 1 detik)
     - view_pricing     : section #order (paket harga) dilihat           -> Meta: ViewContent
     - cta_click        : semua klik link / tombol (teks, tujuan, posisi section)
     - begin_checkout   : klik tombol ke checkout (lynk.id / scalev)  -> Meta: InitiateCheckout
     - contact_whatsapp : klik WhatsApp                                -> Meta: Contact
     - join_discord     : klik Discord                                 -> Meta: Lead
     - video_play / video_complete
     - time_on_page     : 30s / 60s / 120s / 300s aktif di halaman

   GANTI ID DI BAWAH. Kosongkan ("") untuk mematikan salah satu.
   ===================================================================== */
(function(){
  var CONFIG = {
    META_PIXEL_ID: "2301347517343812",   // Meta Pixel "Cryptoday 2026 NEW"
    GA4_ID:        "G-FVB9JLMVW5",       // Google Analytics 4 "Cryptoday LP"
    CLARITY_ID:    "",                   // opsional: Microsoft Clarity (heatmap + rekaman scroll, gratis)
    DEBUG:         /[?&]cdtrack_debug=1/.test(location.search)
  };

  if(window.__cdTrack) return;
  window.__cdTrack = true;

  var PAGE = (location.pathname.split("/").pop() || "index.html").replace(/\.html$/,"") || "index";

  /* ---------- Loader: Meta Pixel ---------- */
  var metaOwned = false;
  if(CONFIG.META_PIXEL_ID){
    if(!window.fbq){
      !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
      n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
      n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
      t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,
      document,'script','https://connect.facebook.net/en_US/fbevents.js');
      metaOwned = true;
    }
    fbq('init', CONFIG.META_PIXEL_ID);
    // Kalau halaman sudah punya pixel (mis. dipasang Scalev), PageView tidak dikirim lagi biar tidak dobel.
    if(metaOwned) fbq('track', 'PageView');
  }

  /* ---------- Loader: GA4 ---------- */
  if(CONFIG.GA4_ID){
    window.dataLayer = window.dataLayer || [];
    if(!window.gtag){
      window.gtag = function(){ dataLayer.push(arguments); };
      var g = document.createElement('script');
      g.async = true; g.src = 'https://www.googletagmanager.com/gtag/js?id=' + CONFIG.GA4_ID;
      document.head.appendChild(g);
      gtag('js', new Date());
    }
    gtag('config', CONFIG.GA4_ID, { page_title: document.title, lp_name: PAGE });
  }

  /* ---------- Loader: Microsoft Clarity ---------- */
  if(CONFIG.CLARITY_ID && !window.clarity){
    (function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
    t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
    y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);})(window,document,"clarity","script",CONFIG.CLARITY_ID);
  }

  /* ---------- Kirim event ---------- */
  // metaStd: nama standard event Meta (opsional). Tanpa itu dikirim sebagai custom event.
  function send(name, params, metaStd){
    params = params || {};
    params.lp_name = PAGE;
    if(CONFIG.DEBUG) console.log('[cd-track]', name, metaStd || '', params);
    try{ if(CONFIG.GA4_ID && window.gtag) gtag('event', name, params); }catch(e){}
    try{
      if(CONFIG.META_PIXEL_ID && window.fbq){
        if(metaStd) fbq('trackSingle', CONFIG.META_PIXEL_ID, metaStd, params);
        fbq('trackSingleCustom', CONFIG.META_PIXEL_ID, name, params);
      }
    }catch(e){}
    try{ if(window.clarity) clarity('event', name); }catch(e){}
  }
  window.cdTrack = send;

  /* ---------- Helper: nama section ---------- */
  function sectionOf(el){
    var s = el && el.closest ? el.closest('section, footer, header, .sticky, .dc-float, .hud') : null;
    if(!s) return 'other';
    if(s.id) return s.id;
    if(s.classList.contains('hero')) return 'hero';
    if(s.classList.contains('sticky')) return 'sticky_bar';
    if(s.classList.contains('dc-float')) return 'floating_discord';
    if(s.classList.contains('hud')) return 'hud';
    var h = s.querySelector('h1, h2, h3');
    if(h) return (h.innerText || h.textContent).trim().replace(/\s+/g,' ').slice(0,60);
    var all = document.querySelectorAll('section');
    for(var i=0;i<all.length;i++){ if(all[i]===s) return 'section_' + (i+1); }
    return 'other';
  }
  function clean(t){ return (t||'').replace(/\s+/g,' ').trim().slice(0,100); }

  /* ---------- 1. Scroll depth ---------- */
  var marks = [25,50,75,90,100], hit = {}, maxPct = 0;
  function onScroll(){
    var doc = document.documentElement;
    var h = Math.max(doc.scrollHeight, document.body.scrollHeight) - window.innerHeight;
    var pct = h > 0 ? Math.round((window.scrollY / h) * 100) : 100;
    if(pct > maxPct) maxPct = pct;
    marks.forEach(function(m){
      if(pct >= m && !hit[m]){ hit[m] = true; send('scroll_depth', { percent_scrolled: m }); }
    });
  }
  window.addEventListener('scroll', onScroll, { passive:true });

  /* ---------- 2. Section view ---------- */
  if('IntersectionObserver' in window){
    var seen = {}, timers = new Map();
    var io = new IntersectionObserver(function(entries){
      entries.forEach(function(en){
        var name = sectionOf(en.target);
        if(seen[name]) return;
        if(en.isIntersecting){
          timers.set(en.target, setTimeout(function(){
            seen[name] = true; io.unobserve(en.target);
            send('section_view', { section: name });
            if(name === 'order') send('view_pricing', { section: name }, 'ViewContent');
          }, 1000));
        } else if(timers.has(en.target)){
          clearTimeout(timers.get(en.target)); timers.delete(en.target);
        }
      });
    // Dihitung "dilihat" kalau section ada di area tengah layar (40% tengah) selama 1 detik.
    // Pakai rootMargin, bukan threshold, karena section di HP bisa lebih tinggi dari layar.
    }, { rootMargin: '-30% 0px -30% 0px', threshold: 0 });
    var observeAll = function(){ document.querySelectorAll('section').forEach(function(s){ io.observe(s); }); };
    if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', observeAll); else observeAll();
  }

  /* ---------- 3. Klik tombol / link ---------- */
  document.addEventListener('click', function(e){
    var el = e.target.closest ? e.target.closest('a, button') : null;
    if(!el) return;
    var href = el.getAttribute('href') || '';
    var full = el.href || '';
    var p = {
      button_text: clean(el.getAttribute('aria-label')) || clean(el.innerText || el.textContent),
      link_url: href.charAt(0) === '#' ? href : full,
      section: sectionOf(el),
      button_type: el.tagName === 'BUTTON' ? 'toggle' : (href.charAt(0) === '#' ? 'scroll' : 'link')
    };
    if(el.hasAttribute('data-order')) p.package = el.getAttribute('data-order');
    if(el.hasAttribute('data-lp')) p.product = el.getAttribute('data-lp');

    send('cta_click', p);

    if(/lynk\.id\/.+\/checkout|myscalev\.com\/(?!gabung-discord)/i.test(full)){
      send('begin_checkout', p, 'InitiateCheckout');
    } else if(/wa\.me|whatsapp/i.test(full)){
      send('contact_whatsapp', p, 'Contact');
    } else if(/discord/i.test(full) || el.classList.contains('dc-float')){
      send('join_discord', p, 'Lead');
    } else if(/\.html(#|$)/.test(href) && !/^https?:/i.test(href)){
      send('open_product_page', p);
    }
  }, true);

  /* ---------- 4. Video ---------- */
  function hookVideos(){
    document.querySelectorAll('video').forEach(function(v, i){
      var id = 'video_' + (i+1), started = false;
      v.addEventListener('play', function(){ if(!started){ started = true; send('video_play', { video: id, section: sectionOf(v) }); } });
      v.addEventListener('ended', function(){ send('video_complete', { video: id, section: sectionOf(v) }); });
    });
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', hookVideos); else hookVideos();

  /* ---------- 5. Waktu aktif di halaman ---------- */
  var active = 0, tMarks = [30,60,120,300], tHit = {};
  setInterval(function(){
    if(document.visibilityState !== 'visible') return;
    active += 5;
    tMarks.forEach(function(s){
      if(active >= s && !tHit[s]){ tHit[s] = true; send('time_on_page', { seconds: s, max_scroll: maxPct }); }
    });
  }, 5000);
})();
