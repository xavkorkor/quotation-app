// Compatibility cleanup for older cached pages that loaded the retired paste/import panel.
(function(){
  function removeRetiredPanel(){document.getElementById('collatedPanel')?.remove()}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',removeRetiredPanel);
  else removeRetiredPanel();
})();

