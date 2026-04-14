async function uploadToday() {
  try {
    const files = document.getElementById("fileInput").files;

    if (!files || files.length === 0) {
      alert("파일 선택해라");
      return;
    }

    const formData = new FormData();

    for (let file of files) {
      formData.append("files", file);
    }

    const res = await fetch("/today", {
      method: "POST",
      body: formData
    });

    const data = await res.json();

    renderList(data);

  } catch (err) {
    console.error(err);
  }
}

const categoryNotes = {
  '정육 / 치즈': [
    { keyword: '다짐육 2.2', note: '40,000 이하' },
    { keyword: '다짐육 3', note: '45,000 이하' },
    { keyword: '꽃갈비살', note: '1.3kg 기준 109,000 이하' },
    { keyword: '살치살', note: '1.3kg 기준 84,990 이하' },
    { keyword: '토시살', note: '1.1kg 기준 70,990 이하' },
    { keyword: '홍두깨', note: '2.6kg 기준 60,000 이하' },
    { keyword: '아롱사태 1.7', note: '61,570 이하' },
    { keyword: '아롱사태 2.5', note: '75,000 이하' },
    { keyword: '채끝', note: '70,750 이하' },
    { keyword: '부채살', note: '63,000 이하' },
    { keyword: '척아이롤', note: '65,000 이하' },
    { keyword: '등갈비 생고기', note: '1.2kg 기준 61,570 이하' },
    { keyword: '국내산 삼겹살', note: '2.3kg 기준 64,000 이하' },
    { keyword: '국산 삼겹살', note: '2.3kg 기준 64,000 이하' },
    { keyword: '국산 목심', note: '2.2kg 기준 58,000 이하' },
    { keyword: '국산 목살', note: '2.2kg 기준 58,000 이하' },
    { keyword: '국내산 목살', note: '2.2kg 기준 58,000 이하' },
    { keyword: '국내산 목심', note: '2.2kg기준 58,000 이하' },
    { keyword: '캐나다산 삼겹살', note: '3kg 기준 45,990 이하' },
    { keyword: '캐나다 삼겹살', note: '3kg 기준 45,990 이하' },
    { keyword: '캐나다산 목심', note: '3kg 기준 50,480 이하' },
    { keyword: '캐나다산 목살', note: '3kg 기준 50,480 이하' },
    { keyword: '캐나다 목살', note: '3kg 기준 50,480 이하' },
    { keyword: '캐나다 목심', note: '3kg 기준 50,480 이하' },
    { keyword: '데친문어', note: '49,000 이하' }
  ]
};

function getItemNotes(category, itemName) {
  const notes = categoryNotes[category];
  if (!notes || !itemName) return [];

  const lowerName = itemName.toLowerCase();
  return notes
    .filter(entry => lowerName.includes(entry.keyword.toLowerCase()))
    .map(entry => entry.note);
}

function setPageTitle() {
  const today = new Date();
  const month = today.getMonth() + 1;
  const day = today.getDate();
  const title = document.getElementById('pageTitle');
  if (title) {
    title.innerText = `${month}/${day} 주문`;
  }
}

setPageTitle();

//카드 렌더링

function renderList(data) {
  const container = document.getElementById("shoppingList");
  container.innerHTML = "";

  for (let category in data) {
    if (!Array.isArray(data[category]) || data[category].length === 0) {
      continue; // 빈 카테고리는 렌더링하지 않음
    }

    const section = document.createElement("div");

    const title = document.createElement("h2");
    title.innerText = category;

    section.appendChild(title);

    data[category].forEach(item => {

      const itemNotes = getItemNotes(category, item.name);
      const noteHtml = itemNotes.length
        ? `<div class="item-notes">${itemNotes.map(note => `<span class="item-note">${note}</span>`).join('')}</div>`
        : '';

      const card = document.createElement("div");
      card.className = "card";

      card.innerHTML = `
        <div class="card-container">
          <div class="card-content">
            <div class="card-row">
              <div class="card-info">
                <strong>${item.name}</strong><br>
                수량: ${item.quantity}<br>
                위치: 미정
                ${noteHtml}
              </div>
              <div class="card-actions">
                <input type="checkbox" aria-label="선택">
                <button class="plus-button">+</button>
              </div>
            </div>
          </div>
          <div class="delete-button">
            <button type="button" class="delete-btn">🗑️</button>
          </div>
        </div>
      `;

      const checkbox = card.querySelector('input[type="checkbox"]');
      checkbox.addEventListener('change', () => {
        card.classList.toggle('checked', checkbox.checked);
      });

      const cardContent = card.querySelector('.card-content');
      cardContent.addEventListener('dblclick', (e) => {
        if (e.target.closest('.plus-button') || e.target.closest('.delete-btn') || e.target.closest('input[type="checkbox"]')) {
          return;
        }
        checkbox.checked = !checkbox.checked;
        card.classList.toggle('checked', checkbox.checked);
      });

      // 스와이프 기능 추가
      addSwipeFunctionality(card);

      // + 버튼 이벤트 수정
      const plusButton = card.querySelector('.plus-button');
      plusButton.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        showPopupMenu(item);
      });

      const deleteButton = card.querySelector('.delete-btn');
      deleteButton.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        deleteItem(item.name);
      });
      deleteButton.addEventListener('touchstart', (e) => {
        e.stopPropagation();
      });

      section.appendChild(card);
    });

    container.appendChild(section);
  }
}

function addSwipeFunctionality(card) {
  let startX = 0;
  let currentX = 0;
  let isDragging = false;

  const content = card.querySelector('.card-content');

  // 터치 시작 - + 버튼, 삭제 버튼 제외
  card.addEventListener('touchstart', (e) => {
    // + 버튼, 체크박스 또는 삭제 버튼 클릭 시 스와이프 무시
    if (e.target.closest('.plus-button') || e.target.closest('.delete-btn') || e.target.closest('input[type="checkbox"]')) {
      return;
    }
    startX = e.touches[0].clientX;
    isDragging = true;
    card.classList.remove('swiped');
  });

  // 터치 이동
  card.addEventListener('touchmove', (e) => {
    if (!isDragging) return;

    currentX = e.touches[0].clientX;
    const diff = currentX - startX;

    if (diff > 50) { // 오른쪽으로 50px 이상 스와이프
      card.classList.add('swiped');
    } else if (diff < -50) { // 왼쪽으로 스와이프하면 숨김
      card.classList.remove('swiped');
    }
  });

  // 터치 끝
  card.addEventListener('touchend', () => {
    isDragging = false;
  });

  // 마우스 이벤트도 지원 (데스크톱용) - + 버튼 제외
  card.addEventListener('mousedown', (e) => {
    // + 버튼, 체크박스 또는 삭제 버튼 클릭 시 스와이프 무시
    if (e.target.closest('.plus-button') || e.target.closest('.delete-btn') || e.target.closest('input[type="checkbox"]')) {
      return;
    }
    startX = e.clientX;
    isDragging = true;
    card.classList.remove('swiped');
  });

  card.addEventListener('mousemove', (e) => {
    if (!isDragging) return;

    currentX = e.clientX;
    const diff = currentX - startX;

    if (diff > 50) {
      card.classList.add('swiped');
    } else if (diff < -50) {
      card.classList.remove('swiped');
    }
  });

  card.addEventListener('mouseup', () => {
    isDragging = false;
  });

  // 카드 외부 클릭 시 스와이프 해제
  document.addEventListener('click', (e) => {
    if (!card.contains(e.target)) {
      card.classList.remove('swiped');
    }
  });
}

function deleteItem(itemName) {
  // localStorage에서 메모 삭제
  const memoKey = `memo_${itemName}`;
  localStorage.removeItem(memoKey);

  // 카드 삭제
  const cards = document.querySelectorAll('.card');
  cards.forEach(card => {
    const cardName = card.querySelector('.card-info strong').textContent;
    if (cardName === itemName) {
      card.remove();
    }
  });
}

function showPopupMenu(item) {
  const popup = document.getElementById('popupMenu');
  popup.style.display = 'flex';

  // 팝업 외부 클릭 시 닫기
  popup.onclick = (e) => {
    if (e.target === popup) {
      popup.style.display = 'none';
    }
  };

  // 지도보기 버튼 이벤트
  const mapButton = popup.querySelector('button:first-child');
  mapButton.onclick = () => {
    popup.style.display = 'none';
    showMap(item);
  };

  // 메모 버튼 이벤트
  const memoButton = popup.querySelector('button:last-child');
  memoButton.onclick = () => {
    popup.style.display = 'none';
    showMemo(item);
  };
}

function showMap(item) {
  // map.png가 있으면 표시, 없으면 기본 메시지
  const mapImage = new Image();
  mapImage.src = 'map.png';
  mapImage.onload = () => {
    // 지도 이미지가 있으면 표시
    const popup = document.createElement('div');
    popup.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.8);
      z-index: 1002;
      display: flex;
      justify-content: center;
      align-items: center;
    `;
    popup.innerHTML = `
      <div style="background: white; padding: 20px; border-radius: 10px; max-width: 90%; max-height: 90%; overflow: auto;">
        <h3>${item.name} 위치</h3>
        <img src="map.png" style="max-width: 100%; max-height: 400px;" alt="지도">
        <button onclick="this.parentElement.parentElement.remove()" style="margin-top: 10px; padding: 8px 16px; background: #667eea; color: white; border: none; border-radius: 5px; cursor: pointer;">닫기</button>
      </div>
    `;
    document.body.appendChild(popup);
  };
  mapImage.onerror = () => {
    alert(`${item.name}의 지도 이미지가 아직 준비되지 않았습니다.`);
  };
}

function showMemo(item) {
  const popup = document.getElementById('memoPopup');
  const textarea = document.getElementById('memoText');
  const title = popup.querySelector('h3');

  title.textContent = `${item.name} 메모`;

  // 기존 메모 불러오기 (localStorage에서)
  const memoKey = `memo_${item.name}`;
  textarea.value = localStorage.getItem(memoKey) || '';

  popup.style.display = 'flex';

  // 팝업 외부 클릭 시 닫기
  popup.onclick = (e) => {
    if (e.target === popup) {
      closeMemo();
    }
  };
}

function saveMemo() {
  const textarea = document.getElementById('memoText');
  const itemName = document.querySelector('.memo-content h3').textContent.replace(' 메모', '');

  // 메모 저장 (localStorage에)
  const memoKey = `memo_${itemName}`;
  localStorage.setItem(memoKey, textarea.value);

  closeMemo();
  alert('메모가 저장되었습니다.');
}

function closeMemo() {
  const popup = document.getElementById('memoPopup');
  popup.style.display = 'none';
}

function finishShopping() {
  const cards = document.querySelectorAll('.card');
  const unpurchasedItems = [];

  cards.forEach(card => {
    const checkbox = card.querySelector('input[type="checkbox"]');
    if (!checkbox.checked) {
      const itemName = card.querySelector('.card-info strong').textContent;
      const memoKey = `memo_${itemName}`;
      const memo = localStorage.getItem(memoKey) || '';

      // 메모가 있으면 [메모] 형식으로, 없으면 빈 문자열
      const memoText = memo ? `[${memo}]` : '';
      unpurchasedItems.push(`${itemName}${memoText}`);
    }
  });

  if (unpurchasedItems.length === 0) {
    alert('모든 품목을 구매하셨습니다!');
    return;
  }

  const resultText = unpurchasedItems.join('\n');
  document.getElementById('unpurchasedItems').textContent = resultText;

  const popup = document.getElementById('resultPopup');
  popup.style.display = 'flex';

  // 팝업 외부 클릭 시 닫기
  popup.onclick = (e) => {
    if (e.target === popup) {
      closeResult();
    }
  };
}

function closeResult() {
  const popup = document.getElementById('resultPopup');
  popup.style.display = 'none';
}

function copyToClipboard() {
  const title = document.querySelector('.result-header h3').textContent;
  const content = document.getElementById('unpurchasedItems').textContent;

  const fullText = `${title}\n\n${content}`;

  navigator.clipboard.writeText(fullText).then(() => {
    // 복사 성공 시 버튼에 잠시 피드백 표시
    const button = document.querySelector('.copy-button');
    const originalText = button.textContent;
    button.textContent = '✅';
    button.style.background = '#d4edda';

    setTimeout(() => {
      button.textContent = originalText;
      button.style.background = '';
    }, 1000);
  }).catch(err => {
    console.error('클립보드 복사 실패:', err);
    alert('클립보드 복사에 실패했습니다.');
  });
}

function goAdmin() {
  window.location.href = "/";
}