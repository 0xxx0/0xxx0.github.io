/* HUMAN PORT — Telegram Mini App return adapter.
 * Recovered from the HOUSEBUS Telegram Mini App mechanism, stripped of house semantics.
 * Carries no bot token, chat id, phone number or private endpoint.
 * Telegram WebApp.sendData is the return path for Keyboard Button Mini Apps.
 */
(function(){
  'use strict';
  var root=document.documentElement;
  var PORTBUS=window.PORTBUS||{}; window.PORTBUS=PORTBUS;
  var inTelegram=/(^|[#&?])(tgWebAppData|tgWebAppVersion|tgWebAppPlatform)=/.test(location.hash+location.search)||!!(window.Telegram&&window.Telegram.WebApp);
  PORTBUS.inTelegram=inTelegram; PORTBUS.canSend=false;
  function init(){
    var wa=window.Telegram&&window.Telegram.WebApp; if(!wa)return;
    PORTBUS.wa=wa; PORTBUS.canSend=typeof wa.sendData==='function';
    try{wa.ready()}catch(e){} try{wa.expand()}catch(e){}
    root.setAttribute('data-port-surface','telegram');
    document.dispatchEvent(new CustomEvent('portbus:ready',{detail:{surface:'telegram',canSend:PORTBUS.canSend}}));
  }
  PORTBUS.sendPacket=function(packetText){
    var wa=window.Telegram&&window.Telegram.WebApp;
    if(!wa||typeof wa.sendData!=='function')return {ok:false,reason:'not-keyboard-mini-app'};
    var payload=JSON.stringify({schema:'human-port-webapp-return/v0.1',packet:String(packetText||'')});
    var n=new TextEncoder().encode(payload).length;
    if(n>4096)return {ok:false,reason:'telegram-4096-byte-limit',bytes:n};
    try{wa.sendData(payload);return {ok:true,bytes:n}}catch(e){return {ok:false,reason:String(e&&e.message||e)}}
  };
  if(inTelegram&&!(window.Telegram&&window.Telegram.WebApp)){
    var s=document.createElement('script');s.src='https://telegram.org/js/telegram-web-app.js';s.onload=init;document.head.appendChild(s);
  }else if(inTelegram){init()}else{root.setAttribute('data-port-surface','web')}
})();