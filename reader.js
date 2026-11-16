'use strict';
const selector=document.getElementById('chapter-select');
function chooseChapter(id){if(selector.value!==id){selector.value=id;selector.dispatchEvent(new Event('change'));}}
function revealHash(focus=true){
  let id;try{id=decodeURIComponent(location.hash.slice(1));}catch{return;}
  const target=document.getElementById(id);if(!target)return;
  const details=target.closest('details');if(details)details.open=true;
  const chapter=target.closest('.chapter');if(chapter)chooseChapter(chapter.id);
  if(focus){const control=target.matches('details')?target.querySelector('summary'):target.querySelector('h3[tabindex]');if(control)control.focus({preventScroll:true});target.scrollIntoView({block:'start'});}
}
document.querySelectorAll('.listen-chapter').forEach(link=>link.addEventListener('click',()=>chooseChapter(link.dataset.chapter)));
window.addEventListener('hashchange',()=>revealHash());
revealHash(false);
