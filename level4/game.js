const CASES=[
['Финансовый директор','👨‍💼','Бюджет посчитан, риски отмечены, цифры сходятся. Запускаем?','approve','Документ готов к решению'],
['Стажёр Аркадий','🧑‍🎓','Я отправил презентацию без цифр, но с красивым градиентом. Норм?','rework','Красиво — не значит готово'],
['Коллега из чата','👩‍💻','Предлагаю обсудить цвет папок в архиве за 2019 год.','park','Не горит и не влияет на результат'],
['Юрист','⚖️','Договор проверен, замечания учтены, подписи на месте.','approve','Все обязательные проверки пройдены'],
['Маркетолог','📣','Запустим рекламу без ссылки, потом как-нибудь добавим.','rework','Нет ссылки — нет результата'],
['Главный визионер','🧙','А давайте когда-нибудь сделаем корпоративную метавселенную!','park','Идея может подождать в бэклоге'],
['Аналитик','📈','Метрики подтверждают рост, A/B-тест завершён. Масштабируем?','approve','Решение подтверждено данными'],
['Продакт','🧩','Требования меняются каждый час, но разработку уже начинаем.','rework','Сначала фиксируем требования'],
['Офис-менеджер','🪴','Нужно срочно выбрать имя для третьего фикуса.','park','Фикус переживёт отсутствие нейминга'],
['Безопасник','🛡️','Доступы минимальные, аудит пройден, резервная копия есть.','approve','Риски под контролем'],
['Дизайнер','🎨','Макет один, но мобильную версию я мысленно представил.','rework','Мобильный макет нужен не мысленно'],
['Директор','👑','Все согласовали. Осталось нажать зелёную кнопку.','approve','Иногда согласование действительно заканчивается']
];
let order=[],idx=0,score=0,streak=0,correct=0,locked=false,timerId=null,startTime=0,deadline=5000;
const $=id=>document.getElementById(id);function screen(id){document.querySelectorAll('.screen').forEach(x=>x.classList.remove('show'));$(id).classList.add('show')}
function start(){order=[...CASES].sort(()=>Math.random()-.5);idx=score=streak=correct=0;startTime=Date.now();screen('game');showCase()}
function showCase(){if(idx>=order.length)return finish();locked=false;const c=order[idx];$('round').textContent=idx+1;$('speaker').textContent=c[1];$('role').textContent=c[0];$('phrase').textContent=c[2];$('hint').textContent='Что решит настоящий мастер согласований?';$('feedback').textContent='';const began=performance.now();clearInterval(timerId);timerId=setInterval(()=>{const left=Math.max(0,1-(performance.now()-began)/deadline);$('timer').style.transform=`scaleX(${left})`;if(!left){clearInterval(timerId);answer('timeout')}},50)}
function answer(action){if(locked)return;locked=true;clearInterval(timerId);const c=order[idx],ok=action===c[3];if(ok){correct++;streak++;score+=100+Math.min(streak,5)*20;$('feedback').textContent=`✅ Верно! ${c[4]}`;$('feedback').style.color='#4ade80'}else{streak=0;$('feedback').textContent=`❌ ${action==='timeout'?'Время вышло':'Не то решение'}. ${c[4]}`;$('feedback').style.color='#fb7185'}$('streak').textContent=streak;$('score').textContent=score;idx++;setTimeout(showCase,900)}
function finish(){const elapsed=Math.round((Date.now()-startTime)/1000),passed=correct>=8,medal=correct>=11?'🥇':correct>=9?'🥈':passed?'🥉':'-';$('resultEmoji').textContent=passed?'🤝✅':'📋🔁';$('resultTitle').textContent=passed?'СОВЕЩАНИЕ ПЕРЕЖИТО!':'ВЕРНУЛИ НА ДОРАБОТКУ';$('resultText').textContent=passed?'Ты принимал решения быстрее, чем коллеги включали микрофон.':'Нужно ещё немного корпоративной интуиции.';$('resultStats').textContent=`${correct}/12 решений · ${score} очков · ${elapsed} сек.`;$('next').style.display=passed?'block':'none';if(passed)Progress.completeLevel(4,{time:elapsed,score,medal});else Progress.sendAnalytics(4,{time:elapsed,distance:score,medal,result:'fail'});screen('result');loadLeaderboard()}
function loadLeaderboard(){Progress.fetchLeaderboard(4,list=>{const el=$('lb4');if(!list.length){el.innerHTML='<div class="lb-empty">Пока переговорная свободна</div>';return}const m=['🥇','🥈','🥉','👍','👍'];el.innerHTML=list.map((e,i)=>`<div class="lb-row"><span class="lb-rank">${m[i]}</span><span class="lb-name">${Progress.escapeHtml(e.name)}</span><span class="lb-score">${e.score}</span></div>`).join('')})}
document.querySelectorAll('.actions button').forEach(b=>b.onclick=()=>answer(b.dataset.action));$('startBtn').onclick=start;$('retry').onclick=start;$('next').onclick=()=>location.href='../level5/index.html';Telegram?.WebApp?.expand?.();
