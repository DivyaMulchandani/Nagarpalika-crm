// Shared site shell — header (tricolor + brand bar + saffron nav), marquee, footer.
// Plus a tiny i18n applied to [data-i18n] elements.

(function () {
  const HEADER = `
<div class="tricolor"><span class="saffron"></span><span class="white"></span><span class="green"></span></div>
<div class="brand-bar">
  <img src="assets/gov-gujarat-emblem.svg" alt="Government of Gujarat emblem">
  <div style="min-width:0;flex:1 1 auto;">
    <div class="brand-title" data-i18n="brand.title">Government of Gujarat &middot; Recruitment Portal</div>
    <div class="brand-sub">
      <span data-i18n="brand.sub">Department of Urban Development &amp; Urban Housing</span>
      &middot; <span class="guj">ગુજરાત સરકાર &middot; શહેરી વિકાસ વિભાગ</span>
    </div>
  </div>
  <div class="brand-utility">
    <a href="#main" data-i18n="util.skip">Skip to Main</a>
    <span class="sep">|</span>
    <a href="#" data-i18n="util.screen">Screen Reader</a>
    <span class="sep">|</span>
    <a href="#" data-i18n="util.az">A+ A-</a>
    <span class="sep">|</span>
    <div class="lang-toggle" role="group" aria-label="Language">
      <button data-lang="en" type="button">EN</button>
      <button data-lang="hi" type="button">हिं</button>
      <button data-lang="gu" type="button">ગુ</button>
    </div>
  </div>
</div>
<div class="nav-row">
  <a href="index.html" data-page="home" data-i18n="nav.home">HOME</a>
  <a href="about.html" data-page="about" data-i18n="nav.about">ABOUT</a>
  <a href="careers.html" data-page="careers" data-i18n="nav.careers">CAREERS / ભરતી</a>
  <a href="notices.html" data-page="notices" data-i18n="nav.notices">NOTICES</a>
  <a href="results.html" data-page="results" data-i18n="nav.results">RESULT</a>
  <a href="callletter.html" data-page="callletter" data-i18n="nav.callletter">CALL LETTER</a>
  <a href="contact.html" data-page="contact" data-i18n="nav.contact">CONTACT</a>
</div>
<div class="marquee">
  <div class="marquee-tag">LATEST</div>
  <div class="marquee-track-wrap"><div class="marquee-track" id="marquee-track"></div></div>
</div>
`;

  const MARQUEE_ITEMS = [
    'Advt. UD/2026/04 — Town Planner & Junior Engineer · Last date 22/05/2026',
    'Public hearing: Ahmedabad Master Plan 2041 — 07/05/2026',
    'Janata Darbar rescheduled to 18/05/2026, Sachivalaya Block 14',
    'Foundation stone laid for Surat Metro Phase II',
    'Buddha Purnima — 14/05/2026 — Gazetted Holiday',
  ];

  const FOOTER = `
<div class="footer">
  <div class="footer-grid">
    <div>
      <h4 data-i18n="ft.brand">Government of Gujarat — Recruitment Portal</h4>
      <div data-i18n="ft.about">An initiative of the Department of Urban Development &amp; Urban Housing. The portal lists official notifications, public functions, and online recruitment for the Department and its affiliated municipal corporations and urban development authorities.</div>
      <div style="margin-top:8px;">Sardar Bhavan, Block 14, 9th Floor, Sachivalaya, Gandhinagar — 382010.</div>
    </div>
    <div>
      <h4 data-i18n="ft.ql">Quick Links</h4>
      <a href="index.html" data-i18n="nav.home">Home</a>
      <a href="careers.html" data-i18n="nav.careers">Careers</a>
      <a href="#">Help Manual</a>
      <a href="#">RTI Portal</a>
    </div>
    <div>
      <h4 data-i18n="ft.help">Help Desk</h4>
      <div>079-2325-XXXX</div>
      <div>helpdesk-ud@gujarat.gov.in</div>
      <div>10:30 – 18:10 (Mon–Fri)</div>
    </div>
  </div>
  <div class="footer-bottom" data-i18n="ft.copy">© All Rights Reserved | Designed, Developed and Hosted by National Informatics Centre (NIC), Gujarat State Centre.</div>
</div>
`;

  const T = {
    en: {
      'brand.title': 'Government of Gujarat · Recruitment Portal',
      'brand.sub': 'Department of Urban Development & Urban Housing',
      'util.skip': 'Skip to Main', 'util.screen': 'Screen Reader', 'util.az': 'A+ A-',
      'nav.home': 'HOME', 'nav.about': 'ABOUT', 'nav.calendar': 'CALENDAR',
      'nav.careers': 'CAREERS / ભરતી', 'nav.notices': 'NOTICES',
      'nav.results': 'RESULT', 'nav.callletter': 'CALL LETTER', 'nav.contact': 'CONTACT',
      'ft.brand': 'Government of Gujarat — Recruitment Portal',
      'ft.about': 'An initiative of the Department of Urban Development & Urban Housing. The portal lists official notifications, public functions, and online recruitment.',
      'ft.ql': 'Quick Links', 'ft.help': 'Help Desk',
      'ft.copy': '© All Rights Reserved | Designed, Developed and Hosted by National Informatics Centre (NIC), Gujarat State Centre.',
      'home.welcome.eyebrow': 'WELCOME · સ્વાગતમ્',
      'home.welcome.h': 'Government of Gujarat — Citizen & Recruitment Portal',
      'home.welcome.guj': 'ગુજરાત સરકાર — નાગરિક અને ભરતી પોર્ટલ',
      'home.cm.title': 'Message from the Hon\'ble Chief Minister',
      'home.cm.guj': 'માનનીય મુખ્યમંત્રીશ્રીનો સંદેશ',
      'home.news.title': 'Latest News & Notices',
      'home.news.guj': 'નવીનતમ સમાચાર અને સૂચનાઓ',
      'home.up.title': 'Upcoming in the Calendar',
      'home.up.guj': 'આગામી કાર્યક્રમો',
      'home.ql.title': 'Quick Links',
      'home.ql.guj': 'ઝડપી લિંક્સ',
      'cal.h': 'Public Calendar — Holidays, Festivals & Functions',
      'cal.guj': 'જાહેર કેલેન્ડર · રજા, તહેવાર અને કાર્યક્રમ',
      'cal.legend.h': 'Gazetted Holiday',
      'cal.legend.f': 'State Festival',
      'cal.legend.fn': 'Public Function',
      'cal.events.title': 'Events This Month — May 2026',
      'cal.events.guj': 'આ માસના કાર્યક્રમ',
      'car.h': 'List of Advertisements which are accepting Online Application',
      'car.guj': 'ઓનલાઇન અરજી સ્વીકારતી જાહેરાતોની યાદી',
      'car.notice.title': 'NOTE · નોંધ',
      'car.notice.body': 'Candidates are advised to read the advertisement carefully before applying online. Applications must be submitted through the Online Job Application System (OJAS). Government service rules and reservation policies of the State of Gujarat apply.',
      'car.filter.label': 'Filter by Class',
      'car.filter.all': 'All', 'car.filter.1': 'Class I', 'car.filter.2': 'Class II', 'car.filter.3': 'Class III',
      'car.apply': 'Apply ▶',
    },
    hi: {
      'brand.title': 'गुजरात सरकार · भर्ती पोर्टल',
      'brand.sub': 'शहरी विकास एवं शहरी आवास विभाग',
      'util.skip': 'मुख्य सामग्री पर जाएँ', 'util.screen': 'स्क्रीन रीडर', 'util.az': 'A+ A-',
      'nav.home': 'मुखपृष्ठ', 'nav.about': 'परिचय', 'nav.calendar': 'कैलेंडर',
      'nav.careers': 'भर्ती', 'nav.notices': 'सूचनाएँ',
      'nav.results': 'परिणाम', 'nav.callletter': 'कॉल लेटर', 'nav.contact': 'संपर्क',
      'ft.brand': 'गुजरात सरकार — भर्ती पोर्टल',
      'ft.about': 'शहरी विकास एवं शहरी आवास विभाग की पहल। यह पोर्टल आधिकारिक सूचनाएँ, सार्वजनिक कार्यक्रम और ऑनलाइन भर्ती सूचीबद्ध करता है।',
      'ft.ql': 'त्वरित लिंक', 'ft.help': 'सहायता डेस्क',
      'ft.copy': '© सर्वाधिकार सुरक्षित | राष्ट्रीय सूचना विज्ञान केंद्र (NIC), गुजरात राज्य केंद्र द्वारा डिज़ाइन एवं होस्टेड।',
      'home.welcome.eyebrow': 'स्वागत है',
      'home.welcome.h': 'गुजरात सरकार — नागरिक एवं भर्ती पोर्टल',
      'home.welcome.guj': 'ગુજરાત સરકાર — નાગરિક અને ભરતી પોર્ટલ',
      'home.cm.title': 'माननीय मुख्यमंत्री का संदेश',
      'home.cm.guj': 'માનનીય મુખ્યમંત્રીશ્રીનો સંદેશ',
      'home.news.title': 'नवीनतम समाचार एवं सूचनाएँ',
      'home.news.guj': 'નવીનતમ સમાચાર અને સૂચનાઓ',
      'home.up.title': 'आगामी कार्यक्रम',
      'home.up.guj': 'આગામી કાર્યક્રમો',
      'home.ql.title': 'त्वरित लिंक',
      'home.ql.guj': 'ઝડપી લિંક્સ',
      'cal.h': 'सार्वजनिक कैलेंडर — अवकाश, त्यौहार एवं कार्यक्रम',
      'cal.guj': 'જાહેર કેલેન્ડર · રજા, તહેવાર અને કાર્યક્રમ',
      'cal.legend.h': 'राजपत्रित अवकाश',
      'cal.legend.f': 'राज्य त्यौहार',
      'cal.legend.fn': 'सार्वजनिक कार्यक्रम',
      'cal.events.title': 'इस माह के कार्यक्रम — मई 2026',
      'cal.events.guj': 'આ માસના કાર્યક્રમ',
      'car.h': 'ऑनलाइन आवेदन स्वीकार करने वाले विज्ञापनों की सूची',
      'car.guj': 'ઓનલાઇન અરજી સ્વીકારતી જાહેરાતોની યાદી',
      'car.notice.title': 'नोट · નોંધ',
      'car.notice.body': 'उम्मीदवारों को सलाह दी जाती है कि ऑनलाइन आवेदन से पहले विज्ञापन ध्यानपूर्वक पढ़ें। आवेदन OJAS के माध्यम से प्रस्तुत किए जाने चाहिए।',
      'car.filter.label': 'श्रेणी के अनुसार फ़िल्टर',
      'car.filter.all': 'सभी', 'car.filter.1': 'श्रेणी I', 'car.filter.2': 'श्रेणी II', 'car.filter.3': 'श्रेणी III',
      'car.apply': 'आवेदन ▶',
    },
    gu: {
      'brand.title': 'ગુજરાત સરકાર · ભરતી પોર્ટલ',
      'brand.sub': 'શહેરી વિકાસ અને શહેરી આવાસ વિભાગ',
      'util.skip': 'મુખ્ય સામગ્રી પર જાઓ', 'util.screen': 'સ્ક્રીન રીડર', 'util.az': 'A+ A-',
      'nav.home': 'મુખપૃષ્ઠ', 'nav.about': 'પરિચય', 'nav.calendar': 'કૅલેન્ડર',
      'nav.careers': 'ભરતી', 'nav.notices': 'સૂચનાઓ',
      'nav.results': 'પરિણામ', 'nav.callletter': 'કૉલ લેટર', 'nav.contact': 'સંપર્ક',
      'ft.brand': 'ગુજરાત સરકાર — ભરતી પોર્ટલ',
      'ft.about': 'શહેરી વિકાસ અને શહેરી આવાસ વિભાગની પહેલ. આ પોર્ટલ સત્તાવાર સૂચનાઓ, જાહેર કાર્યક્રમો અને ઓનલાઇન ભરતી સૂચિબદ્ધ કરે છે.',
      'ft.ql': 'ઝડપી લિંક્સ', 'ft.help': 'સહાય ડેસ્ક',
      'ft.copy': '© સર્વ હક્ક અધિકૃત | નેશનલ ઈન્ફોર્મેટિક્સ સેન્ટર (NIC), ગુજરાત રાજ્ય કેન્દ્ર દ્વારા ડિઝાઇન અને હૉસ્ટ.',
      'home.welcome.eyebrow': 'સ્વાગતમ્',
      'home.welcome.h': 'ગુજરાત સરકાર — નાગરિક અને ભરતી પોર્ટલ',
      'home.welcome.guj': 'Government of Gujarat — Citizen & Recruitment Portal',
      'home.cm.title': 'માનનીય મુખ્યમંત્રીશ્રીનો સંદેશ',
      'home.cm.guj': 'Message from the Hon\'ble Chief Minister',
      'home.news.title': 'નવીનતમ સમાચાર અને સૂચનાઓ',
      'home.news.guj': 'Latest News & Notices',
      'home.up.title': 'આગામી કાર્યક્રમો',
      'home.up.guj': 'Upcoming in the Calendar',
      'home.ql.title': 'ઝડપી લિંક્સ',
      'home.ql.guj': 'Quick Links',
      'cal.h': 'જાહેર કૅલેન્ડર — રજાઓ, તહેવારો અને કાર્યક્રમો',
      'cal.guj': 'Public Calendar · Holidays, Festivals & Functions',
      'cal.legend.h': 'રાજપત્રિત રજા',
      'cal.legend.f': 'રાજ્ય તહેવાર',
      'cal.legend.fn': 'જાહેર કાર્યક્રમ',
      'cal.events.title': 'આ માસના કાર્યક્રમ — મે ૨૦૨૬',
      'cal.events.guj': 'Events This Month',
      'car.h': 'ઓનલાઇન અરજી સ્વીકારતી જાહેરાતોની યાદી',
      'car.guj': 'List of Advertisements accepting Online Application',
      'car.notice.title': 'નોંધ · NOTE',
      'car.notice.body': 'ઉમેદવારોને સલાહ આપવામાં આવે છે કે ઓનલાઇન અરજી કરતાં પહેલાં જાહેરાત કાળજીપૂર્વક વાંચી લેવી. અરજીઓ OJAS દ્વારા જ સબમિટ કરવી.',
      'car.filter.label': 'વર્ગ પ્રમાણે ફિલ્ટર',
      'car.filter.all': 'બધી', 'car.filter.1': 'વર્ગ I', 'car.filter.2': 'વર્ગ II', 'car.filter.3': 'વર્ગ III',
      'car.apply': 'અરજી કરો ▶',
    },
  };

  function applyLang(lang) {
    if (!T[lang]) lang = 'en';
    document.documentElement.lang = lang;
    const dict = T[lang];
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const k = el.getAttribute('data-i18n');
      if (dict[k] != null) el.textContent = dict[k];
    });
    document.querySelectorAll('.lang-toggle button').forEach(b => {
      b.classList.toggle('active', b.dataset.lang === lang);
    });
    try { localStorage.setItem('guj-lang', lang); } catch (e) {}
  }

  function inject() {
    const h = document.querySelector('[data-include="header"]');
    if (h) h.outerHTML = HEADER;
    const f = document.querySelector('[data-include="footer"]');
    if (f) f.outerHTML = FOOTER;

    // marquee
    const track = document.getElementById('marquee-track');
    if (track) {
      const html = MARQUEE_ITEMS.concat(MARQUEE_ITEMS).map(t =>
        `<span class="item"><span class="arrow">▶</span>${t}</span>`
      ).join('');
      track.innerHTML = html;
    }

    // active nav
    const page = document.body.dataset.page;
    if (page) {
      document.querySelectorAll('.nav-row a').forEach(a => {
        if (a.dataset.page === page) a.classList.add('active');
      });
    }

    // lang
    let saved = 'en';
    try { saved = localStorage.getItem('guj-lang') || 'en'; } catch (e) {}
    applyLang(saved);
    document.querySelectorAll('.lang-toggle button').forEach(b => {
      b.addEventListener('click', () => applyLang(b.dataset.lang));
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', inject);
  } else {
    inject();
  }
  window.applyLang = applyLang;
})();
