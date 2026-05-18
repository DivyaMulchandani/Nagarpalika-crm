// import React, { useEffect, useState } from "react";

// const languages = [
//   'af', 'sq', 'am', 'ar', 'hy', 'az', 'eu', 'be', 'bn', 'bs', 'bg', 'ca', 'ceb', 'ny', 'zh-CN',
//   'zh-TW', 'co', 'hr', 'cs', 'da', 'nl', 'en', 'eo', 'et', 'tl', 'fi', 'fr', 'fy', 'gl', 'ka',
//   'de', 'el', 'gu', 'ht', 'ha', 'haw', 'iw', 'he', 'hi', 'hmn', 'hu', 'is', 'ig', 'id', 'ga', 'it',
//   'ja', 'jw', 'kn', 'kk', 'km', 'ko', 'ku', 'ky', 'lo', 'la', 'lv', 'lt', 'lb', 'mk', 'mg', 'ms',
//   'ml', 'mt', 'mi', 'mr', 'mn', 'my', 'ne', 'no', 'or', 'ps', 'fa', 'pl', 'pt', 'pa', 'ro', 'ru',
//   'sm', 'gd', 'sr', 'st', 'sn', 'sd', 'si', 'sk', 'sl', 'so', 'es', 'su', 'sw', 'sv', 'tg', 'ta',
//   'te', 'th', 'tr', 'uk', 'ur', 'ug', 'uz', 'vi', 'cy', 'xh', 'yi', 'yo', 'zu'
// ];

// const GoogleTranslate = () => {
//   const [error, setError] = useState(false);

//   const googleTranslateElementInit = () => {
//     console.log("translate", window.google.translate.TranslateElement.InlineLayout )
//     new window.google.translate.TranslateElement(
//       {
//         pageLanguage: "en",
//         includedLanguages: ["en", "hi", "gu"],
//         // includedLanguages: languages.join(','),
//         layout: window.google.translate.TranslateElement.InlineLayout.SIMPLE,
//         // autoDisplay: false
//       },
//       "google_translate_element"
//     );
//   };

//   useEffect(() => {
//     var addScript = document.createElement("script");
//     addScript.setAttribute(
//       "src",
//       "//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit"
//     );
//     document.body.appendChild(addScript);
//     window.googleTranslateElementInit = googleTranslateElementInit;
//   }, []);

// //   useEffect(() => {
// //     const loadGoogleTranslate = () => {
// //       try {
// //         console.log("log translater")
// //         new window.google.translate.TranslateElement(
// //           {
// //             pageLanguage: 'en',
// //             includedLanguages: languages.join(','),
// //             layout: window.google.translate.TranslateElement.InlineLayout.SIMPLE,
// //           },
// //           'google_translate_element'
// //         );
// //         const script = document.createElement('script');
// //       script.src = '//translate.google.com/translate_a/element.js?cb=loadGoogleTranslate';
// //       script.async = true;
// //       script.onerror = () => setError(true);
// //       document.body.appendChild(script);

// //         console.log("log translater end")
// //       } catch (e) {
// //         console.log("trans error",e);
// //         setError(true);
// //       }
// //     };

// //     window.loadGoogleTranslate = loadGoogleTranslate;

// //     if (window.google && window.google.translate) {
// //       loadGoogleTranslate();
// //       console.log("window.google")
// //     } else {
// //       const script = document.createElement('script');
// //       script.src = '//translate.google.com/translate_a/element.js?cb=loadGoogleTranslate';
// //       script.async = true;
// //       script.onerror = () => setError(true);
// //       document.body.appendChild(script);

// //       return () => {
// //         document.body.removeChild(script);
// //       };
// //     }
// //   }, []);

//   return (
//     <div className="google-trans">
//       {error ? (
//         <p>Error loading Google Translate widget.</p>
//       ) : (
//         <div id="google_translate_element">
//             {/* translate */}
//         </div>
//       )}
//     </div>
//   );
// };

// export default GoogleTranslate;

// /////////////////////////////////////////////////////////////////////////////

// // import React, { useEffect, useRef, useState } from "react";

// // const TranslateComponent = () => {
// //   const googleTranslateRef = useRef(null);
// //   const [scriptLoaded, setScriptLoaded] = useState(false);

// //   useEffect(async () => {
// //     const loadScript = () => {
// //       if (document.getElementById("google-translate-script")) {
// //         setScriptLoaded(true);
// //         return;
// //       }

// //       const script = document.createElement("script");
// //       script.id = "google-translate-script";
// //       script.src = "//translate.google.com/translate_a/element.js?cb=initGoogleTranslate";
// //       script.async = true;
// //       script.onload = () => setScriptLoaded(true);
// //       script.onerror = () => console.error("Error loading Google Translate script");
// //       document.body.appendChild(script);
// //     };

// //     window.initGoogleTranslate = () => {
// //       setScriptLoaded(true);
// //     };

// //     loadScript();

// //     return () => {
// //       const script = document.getElementById("google-translate-script");
// //       if (script) {
// //         document.body.removeChild(script);
// //       }
// //     };
// //   }, []);

// //   useEffect(() => {
// //     if (!scriptLoaded) return;

// //     const initializeGoogleTranslate = async () => {
// //       if (window.google && window.google.translate) {
// //         console.log("gg", window.google.translate)
// //         await new window.google.translate.TranslateElement(
// //           {
// //             pageLanguage: "en",
// //             includedLanguages: "en, hi, gu",
// //             layout: window.google.translate.TranslateElement.InlineLayout.SIMPLE,
// //           },
// //           googleTranslateRef.current
// //         );
// //       } else {
// //         console.error("Google Translate is not available.");
// //       }
// //     };

// //     initializeGoogleTranslate();
// //   }, [scriptLoaded]);

// //   return (
// //     <div className="ms-1 header-item d-none d-sm-flex">
// //       <div ref={googleTranslateRef}></div>
// //     </div>
// //   );
// // };

// // export default TranslateComponent;


import React, { useEffect, useState } from "react";

const languages = [
  'af', 'sq', 'am', 'ar', 'hy', 'az', 'eu', 'be', 'bn', 'bs', 'bg', 'ca', 'ceb', 'ny', 'zh-CN',
  'zh-TW', 'co', 'hr', 'cs', 'da', 'nl', 'en', 'eo', 'et', 'tl', 'fi', 'fr', 'fy', 'gl', 'ka',
  'de', 'el', 'gu', 'ht', 'ha', 'haw', 'iw', 'he', 'hi', 'hmn', 'hu', 'is', 'ig', 'id', 'ga', 'it',
  'ja', 'jw', 'kn', 'kk', 'km', 'ko', 'ku', 'ky', 'lo', 'la', 'lv', 'lt', 'lb', 'mk', 'mg', 'ms',
  'ml', 'mt', 'mi', 'mr', 'mn', 'my', 'ne', 'no', 'or', 'ps', 'fa', 'pl', 'pt', 'pa', 'ro', 'ru',
  'sm', 'gd', 'sr', 'st', 'sn', 'sd', 'si', 'sk', 'sl', 'so', 'es', 'su', 'sw', 'sv', 'tg', 'ta',
  'te', 'th', 'tr', 'uk', 'ur', 'ug', 'uz', 'vi', 'cy', 'xh', 'yi', 'yo', 'zu'
];

const GoogleTranslate = () => {
  const [error, setError] = useState(false);

  useEffect(() => {
    const loadGoogleTranslate = () => {
      try {
        new window.google.translate.TranslateElement(
          {
            pageLanguage: 'en',
            includedLanguages: languages.join(','),
            layout: window.google.translate.TranslateElement.InlineLayout.SIMPLE,
          },
          'google_translate_element'
        );
      } catch (e) {
        setError(true);
      }
    };

    window.loadGoogleTranslate = loadGoogleTranslate;

    if (window.google && window.google.translate) {
      loadGoogleTranslate();
    } else {
      const script = document.createElement('script');
      script.src = '//translate.google.com/translate_a/element.js?cb=loadGoogleTranslate';
      script.async = true;
      script.onerror = () => setError(true);
      document.body.appendChild(script);

      return () => {
        document.body.removeChild(script);
      };
    }
  }, []);

  return (
    <div style={{
        position: "absolute",
        // left: "70%",
        paddingTop: "19px",
        width: "100%",
        zIndex: "9999",
      
    }}>
      {error ? (
        <p>Error loading Google Translate widget.</p>
      ) : (
        <div id="google_translate_element" style={{ paddingBottom: '3px' }}>
        </div>
      )}
    </div>
  );
};

export default GoogleTranslate;
