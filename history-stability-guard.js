// Prevent recursive History preview mutation loops.
// Revision History is already refreshed by the app's aua-history-updated event.
(function(){
  const Native=window.MutationObserver;
  if(!Native||Native.__auaHistorySafe)return;

  function SafeMutationObserver(callback){
    const observer=new Native(callback);
    const nativeObserve=observer.observe.bind(observer);
    observer.observe=function(target,options){
      if(target?.id==='auaHistoryPreview'&&options?.childList)return;
      return nativeObserve(target,options);
    };
    return observer;
  }

  SafeMutationObserver.prototype=Native.prototype;
  SafeMutationObserver.__auaHistorySafe=true;
  SafeMutationObserver.__auaNative=Native;
  window.MutationObserver=SafeMutationObserver;
})();
