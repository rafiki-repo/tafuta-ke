const container = document.querySelector(".container");
const coffees = [
  { mtype: "menu", name: "eng:Together We Can|ksw:Pamoja Tunaweza|kmb:Vamwe Nitutonya|kyu:TÅ©Ä© hamwe tÅ©nooete", 
    desc: '{eng:"This web app provides links to resources in Kenya that are dedicated to helping end unemployment. Learn more and join the movement by visiting pamoja.or.ke",ksw:"Programu hii ya wavuti inaunganisha rasilimali nchini Kenya zinazolenga kukomesha ukosefu wa ajira. Jifunze zaidi na ujiunge na harakati kwa kutembelea pamoja.or.ke",kmb:"This web app provides links to resources in Kenya that are dedicated to helping end unemployment. Learn more and join the movement by visiting pamoja.or.ke (kmb)"}', 
    image: "images/pamoja.png" , href: "https://pamoja.iheartkenya.org"},
  { mtype: "menu", name: "eng:Pamoja > Surveys|ksw:Pamoja > Surveys (ksw)|kmb:Pamoja > Surveys (kmb)", 
    desc: '{eng:"Let your voice be heard. Take a survey or place a vote. Visit survey.pamoja.ke",ksw:"Let your voice be heard. Take a survey and place a vote. Visit survey.pamoja.ke",kmb:"Let your voice be heard. Take a survey and place a vote. Visit survey.pamoja.ke"}', 
    image: "images/surveys.jpg", href: "https://pamoja.iheartkenya.org"  },
  { mtype: "menu", name: "eng:Job board - FREE!|ksw:Jobs board|kmb:Jobs board",
    desc: '{eng:"Joby.Africa is a free job board. If you are looking for a job or need a talented employee, visit Joby.Afica",ksw:"Joby.Africa is a free job board. If you are looking for a job or need a talented employee, visit Joby.Afica",kmb:"Joby.Africa is a free job board. If you are looking for a job or need a talented employee, visit Joby.Afica"}', 
    image: "images/joby.png", href: "https://Joby.Africa" },
  { mtype: "ad", name: '{eng:"Heniv Spa &amp; College",ksw:"Heniv Spa &amp; College",kmb:"Heniv Spa &amp; College"}', 
    desc: '{eng:"Heniv is the best luxury spa, beauty salon, and Beauty College in the Machakos region. Come visit us!",ksw:"Heniv Spa &amp; College",kmb:"Heniv Spa &amp; College"}', 
    image: "images/heniv01.jpg", href: "https://Heniv.com" },
  { mtype: "ad", name: "eng:Local Businesses|ksw:Biashara za Ndani|kmb:Viasala sya Kuu", 
    desc: '{eng:"Description",ksw:"Description",kmb:"Description"}', image: "images/coffee3.jpg" , href: "https://heartofkenya.com/machakos"},
  { mtype: "menu",name: "eng:Sasa - Coming soon!|ksw:Sasa - Coming soon!|kmb:Sasa - Coming soon!", image: "images/motorbike.jpg", href: "https://sasa.iheartkenya.org" },
  { mtype: "ad", name: "Scale up your Business", 
    desc: '{eng:"Description",ksw:"Description",kmb:"Description"}',image: "images/coffee4.jpg", href: "https://eBiasharaRahisi.com" },
  { mtype: "menu", name: "Place your ad here", 
    desc: '{eng:"Promote your buisness! Place your ad on this website or on one of our other business partners websites. Contact us by email or WhatApp for more information.",ksw:"Description",kmb:"Description"}', image: "images/coffee3.jpg" , href: "/sample"},
];


if ("serviceWorker" in navigator) {
  window.addEventListener("load", function() {
    navigator.serviceWorker
      .register("sw.js")
      .then(res => console.log("service worker registered"))
      .catch(err => console.log("service worker not registered", err))
  })
}

const initApp = () => {
  showMenu();

  // then lets init the language
  initLanguage();

  // Show/Hide login/logout buttons
  setLoginLogout();

  captureSideMenu();
}

const showMenu = () => {
  // Now lets build the menu
  let output = "";
  coffees.forEach(
    ({ mtype, name, image, href, desc }, index) => {
      var title='';
      var dataset='';
      var trim_name = ('' + name).trim();
      if (trim_name.substring(0,1) == "{") {
        dataset = "data-jlang='" + trim_name + "'"; // make sure json does not contain single quotes
      } else if (trim_name.indexOf('|')>0) {
        dataset = "data-lang='" + trim_name + "'"; // name text cannot contain single quotes
      } else {
        title=trim_name;
      }
      const infoIcon = desc ? `<span class="info-icon" onclick="openModal(${index})" style="cursor:pointer;color:#666;font-size:1.5rem;position:absolute;right:0.5rem;">&#9432;</span>` : '';
      if (mtype == 'ad') {
        output += `
              <div class="card" >
                <div style='height:2em;width:100%;background-color:#D8AE31;color:white;text-align:center;font-weight:bold;'>Ad</div>
                <img class="card--avatar" src=${image} />
                <h1 class="card--title" ${dataset} >${title}</h1>
                <div style="position:relative;width:100%;text-align:center;padding:0.5rem 0;">
                  <a class="card--link" href=${href} target='_blank'  style='background-color:#D8AE31;color:white;'>Launch &gt;&gt;</a>
                  ${infoIcon}
                </div>
              </div>
              `;
      } else {
        output += `
                <div class="card" >
                  <img class="card--avatar" src=${image} />
                  <h1 class="card--title" ${dataset} >${title}</h1>
                  <div style="position:relative;width:100%;text-align:center;padding:0.5rem 0;">
                    <a class="card--link" href=${href} target='_blank'>Launch &gt;&gt;</a>
                    ${infoIcon}
                  </div>
                </div>
                `;
      }
    }
  );
  container.innerHTML = output;
}



const openModal = (index) => {
  const item = coffees[index];
  const modalOverlay = document.getElementById('modal-overlay');
  const modalContent = document.getElementById('modal-content');
  
  let title = '';
  let description = '';
  const trim_name = ('' + item.name).trim();
  const lang = localStorage.getItem('sasa_lang') || 'kmb';

  if (trim_name.substring(0,1) == "{") {
    const nameJson = new FlexJson();
    nameJson.DeserializeFlex(trim_name);
    if (nameJson.Status == 0) {
      title = nameJson.v(lang) || nameJson.v('eng') || '';
    } else {
      title = trim_name;
    }
  } else if (trim_name.indexOf('|')>0) {
    const parts = trim_name.split('|');
    const langMap = {};
    parts.forEach(part => {
      const [key, val] = part.split(':');
      langMap[key] = val;
    });
    title = langMap[lang] || langMap.eng || parts[0];
  } else {
    title = trim_name;
  }
  
  if (item.desc) {
    const trim_desc = ('' + item.desc).trim();
    if (trim_desc.substring(0,1) == "{") {
      const descJson = new FlexJson();
      descJson.DeserializeFlex(trim_desc);
      if (descJson.Status == 0) {
        description = descJson.v(lang) || descJson.v('eng') || '';
      } else {
        description = trim_desc;
      }
    } else {
      description = trim_desc;
    }
  }
  
  modalContent.innerHTML = `
    <div style="background-color: #186072; color: white; padding: 1rem; display: flex; justify-content: space-between; align-items: center;">
      <h2 style="margin: 0; font-size: 1.2rem;">${title}</h2>
      <button onclick="closeModal()" style="background: transparent; border: none; color: white; font-size: 1.5rem; cursor: pointer; padding: 0; line-height: 1;">&times;</button>
    </div>
    <div style="padding: 1.5rem; max-height: 60vh; overflow-y: auto;">
      <p style="margin: 0; line-height: 1.6;">${description}</p>
    </div>
    <div style="padding: 1rem; border-top: 1px solid #ddd; text-align: center;">
      <a href="${item.href}" target="_blank" class="card--link" style="display: inline-block; text-decoration: none;">Launch &gt;&gt;</a>
    </div>
  `;
  
  modalOverlay.style.display = 'flex';
};

const closeModal = () => {
  const modalOverlay = document.getElementById('modal-overlay');
  modalOverlay.style.display = 'none';
};

window.openModal = openModal;
window.closeModal = closeModal;

document.addEventListener("DOMContentLoaded", initApp)


// import { FlexJson } from '../node_modules/flex-json/FlexJsonClass.js';
var lang = '';
// NOTE: Remove all Bootstrap display classes (d-flex, d-block, d-inline, d-inline-block) from elements with lang-data tags!

const doUpdateApp = () => {
	out='Updating app...<br>';
	container.innerHTML = out;
	
	// FUTURE: CHECK THAT WE ARE ONLINE CONNECTED TO THE SERVER FIRST!

	// Clear local storage (preserve lang/user)
	var sasa_auth = localStorage.getItem("sasa_auth");
	var sasa_user_id = localStorage.getItem("sasa_user_id");
	var sasa_lang = localStorage.getItem("sasa_lang");
    localStorage.clear();
    sessionStorage.clear();
	if (sasa_auth) { localStorage.setItem("sasa_auth",sasa_auth); }
	if (sasa_user_id) { localStorage.setItem("sasa_user_id",sasa_user_id); }
    if (sasa_lang) { localStorage.setItem("sasa_lang",sasa_lang); }

	// alert("clear caches");
	container.innerHTML += 'Clearing caches...<br>';
	// Clear caches
	// FUTURE: Instead of deleting the caches, we need to reload each item in the cache
	//   and delete any items that no longer exist.
	window.caches.delete("sasa-v1");
	window.caches.delete("sasa-assets");
	
	window.caches.keys().then( (cacheNames) => {
	  console.log(cacheNames);
	  cacheNames.forEach((cacheName) => {
		console.log("Deleting " + cacheName);
		container.innerHTML += '... deleting ' + cacheName + '<br>';
		window.caches.delete(cacheName);
	  });
	});
	
	// alert("refresh service workers");
	container.innerHTML += 'Reloading service worker...<br>';
	
	// FUTURE: Try
	  navigator.serviceWorker.getRegistrations().then(function(registrations) {
		for(let registration of registrations) {
			console.log("DEBUG: UNREGISTER");
			registration.unregister();
			setTimeout(() => {
				//window.location='/';
				window.history.pushState({},"","/");
				window.location.reload(true);
			},2000);
		} 
	  });
  }

  const initLanguage = () => {
	convertDataLang(); // turn data-lang info into HTML elements
	// Determine Language to display as default
	if (!lang) { // only need to update language once at startup of the app
		// get language from local storage
		try {
			lang = localStorage.getItem("sasa_lang");
		} catch {}

		// future: see if users profile has a preferred language stored
		
		// If all else failes, set the language to the default
		if (!lang) {
			lang = 'kmb';
		}
	} 
	updateLanguage(); // Show language elements based on default
  }

  const setLanguage = (newLang) => {
	  localStorage.setItem("sasa_lang",newLang);
	  lang = newLang;
	  updateLanguage();
  }

  const convertDataLang = () => {
	// First convert all data-lang elements to hidden duplicates with lang-* class
	var lang_list = document.querySelectorAll('[data-lang]'); // returns NodeList of elements containing data-lang
	var lang_array = [...lang_list]; // converts NodeList to Array
	lang_array.forEach(el => {
		try {
			var lang_str_debugger = el.dataset['lang']; // debugger
			var lang_str = el.dataset['lang'].split('|');
			var tail=null;
			var new_el = el;
			var first_lang_id, first_lang_text;
			el.style.display = 'none'; // hide
			delete el.dataset['lang']; // remove data-lang
			el.classList.add('lang-all'); // add class lang-all
			lang_str.forEach(lang_item => {
				var lang_item_array = lang_item.split(':',2);
				var lang_id = lang_item_array[0] || '';
				var lang_text = lang_item_array[1] || '';
				if (!tail) {
					first_lang_id = lang_id;
					first_lang_text = lang_text;
				} else {
					new_el = el.cloneNode();
					new_el.classList.add('lang-' + lang_id);
					new_el.innerHTML=lang_text;
					tail.after(new_el); // append element after it has been configured
				}
				tail = new_el;
			});
			// We have to add these at the end so that we don't clone the attributes or text.
			el.classList.add('lang-' + first_lang_id);
			el.innerHTML=first_lang_text;
		} catch (e) { console.log(e); }
	});
	/*
	  $('.lang').each( function () {
		  try {
			var ilang = $(this).attr("data-lang");
			if (ilang) {
				//var jlang = JSON.parse(ilang);
				//this.innerHTML = jlang[lang];
				var mlang = lang + ':';
				var newText = ilang.split('|').filter((item) => item.substr(0,mlang.length)==mlang)[0].split(':')[1];
				this.innerHTML = newText;
				}
			} catch (e) { console.log(e); }
	  });
	  */
	 // Next convert all data-jlang (JSON) elements to hidden duplicates with lang-* class
	var jlang_list = document.querySelectorAll('[data-jlang]'); // returns NodeList of elements containing data-lang
	var jlang_array = [...jlang_list]; // converts NodeList to Array
	jlang_array.forEach(el => {
		try {
			var lang_str_debugger = el.dataset['jlang']; // debugger
			var lang_json = new FlexJson();
			lang_json.DeserializeFlex(lang_str_debugger);
			if (lang_json.Status == 0) {
				var tail=null;
				var new_el = el;
				var first_lang_id, first_lang_text;
				el.style.display = 'none'; // hide
				delete el.dataset['lang']; // remove data-lang
				el.classList.add('lang-all'); // add class lang-all
				var lang_array = lang_json.toJsonArray();
				lang_array.forEach(lang_item => {
					var lang_id = lang_item.key;
					var lang_text = lang_item.v();
					if (!tail) {
						first_lang_id = lang_id;
						first_lang_text = lang_text;
					} else {
						new_el = el.cloneNode();
						new_el.classList.add('lang-' + lang_id);
						new_el.innerHTML=lang_text;
						tail.after(new_el); // append element after it has been configured
					}
					tail = new_el;
				});
			}
			// We have to add these at the end so that we don't clone the attributes or text.
			el.classList.add('lang-' + first_lang_id);
			el.innerHTML=first_lang_text;
		} catch (e2) { console.log(e2); }
	});
  }

  const updateLanguage = () => {
	if (!lang) { return; } // safety - should always be set
	$('.lang-all').hide();
	$('.lang-' + lang).show();
  }

  // ***************************** NAVIGATION/MAIN MENU

// Open and close navigation menu
let openNav = $("#open-nav");
let closeNav = $("#close-nav");

openNav.click(() => {
	console.log("Debug: Open menu > lang=[" + lang + "]");
  
  // Debug: Check what's in the side menu
  var menuLangAll = $("#side-menu .lang-all");
  console.log("Debug: Side menu has " + menuLangAll.length + " elements with .lang-all");
  var menuLangSpecific = $("#side-menu .lang-" + lang);
  console.log("Debug: Side menu has " + menuLangSpecific.length + " elements with .lang-" + lang);
  
  updateLanguage();

  $("#side-menu").addClass("d-block").fadeIn().removeClass("d-none");
  $("#custom-modal").fadeIn().removeClass("d-none");
});
$("#custom-modal").click(() => {
  $("#side-menu").addClass("d-none").fadeOut().removeClass("d-block");
  $("#custom-modal").fadeOut().addClass("d-none");
});

closeNav.click(() => {
  doCloseNav();
});

doCloseNav = () => {
  $("#side-menu").addClass("d-none").fadeOut().removeClass("d-block");
  $("#custom-modal").fadeOut().addClass("d-none");
}

function captureSideMenu() {
	// check if side menu already captured
	if (!localStorage.getItem("main_app_side_menu")) {
	  var side_menu = $("#side-menu").html();
	  localStorage.setItem("main_app_side_menu",side_menu);
	}
}

function setSideMenu() {
	var side_menu = localStorage.getItem("main_app_side_menu");
	if (side_menu) { 
		$("#side-menu").html(side_menu);
		// Rebind close button event after replacing HTML
		$("#close-nav").off("click").on("click", () => {
			doCloseNav();
		});
	}
}

function hideSideMenu() {
	$("#side-menu").addClass("d-none").fadeOut().removeClass("d-block");
	$("#custom-modal").fadeOut().addClass("d-none");
}

function setLoginLogout () {
	var auth=localStorage.getItem("sasa_auth");
	if (auth) {
	  $("#text-login-logout").html("Logout");
	  $("#a-login-logout").attr("href","/login?logout=true&return=/");
	} else {
	  $("#text-login-logout").html("Login");
	  $("#a-login-logout").attr("href","/login?return=/");
	}
  }