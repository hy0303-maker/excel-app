// 🔥 업로드
async function upload() {
  try {
    const files = document.getElementById("fileInput").files;

    if (!files || files.length === 0) {
      alert("파일을 선택해주세요");
      return;
    }

    const formData = new FormData();

    // 🔥 여러 파일 추가
    for (let file of files) {
      formData.append("files", file);
    }

    const res = await fetch("/upload", {
      method: "POST",
      body: formData
    });

    const result = await res.json();

    document.getElementById("result").innerText =
      `추가: ${result.added}개 / 중복: ${result.duplicates}개`;

    await loadData();

  } catch (err) {
    console.error("업로드 에러:", err);
  }
}

// 🔥 데이터 표시
async function loadData() {
  try {
    const res = await fetch("/data");
    const data = await res.json();

    const dataDiv = document.getElementById("data");

    if (!data || Object.keys(data).length === 0) {
      dataDiv.innerText = "파일을 업로드해주세요!";
    } else {
      dataDiv.innerHTML = "";

      for (let category in data) {
        const section = document.createElement("div");
        section.className = "category-box";

        const title = document.createElement("h3");
        title.innerText = category;

        const list = document.createElement("ul");

        data[category].forEach(item => {
  const li = document.createElement("li");

  if (typeof item === "object") {
    li.innerText = `${item.name} (${item.quantity})`;
  } else {
    // 기존 데이터 호환
    li.innerText = item;
  }

  list.appendChild(li);
});
        section.appendChild(title);
        section.appendChild(list);

        dataDiv.appendChild(section);
      }
    }

  } catch (err) {
    console.error("데이터 로드 에러:", err);
  }
}

//초기화

async function resetData() {
  const confirmReset = confirm("진짜 데이터 다 삭제할거야?");
  if (!confirmReset) return;

  try {
    const res = await fetch("/reset", {
      method: "POST"
    });

    const result = await res.json();

    alert(result.message);

    await loadData(); // 화면 갱신

  } catch (err) {
    console.error("초기화 에러:", err);
  }
}

// 🔥 엑셀 다운로드 (안정 버전)
function downloadExcel() {
  const includeQuantity = document.getElementById("includeQuantity").checked;
  window.location.href = `/export?quantity=${includeQuantity ? 1 : 0}`;

  // 다운로드 후 새로고침
  setTimeout(() => {
    location.reload();
  }, 800);
}

// Today 페이지로 이동
function goShop() {
  window.location.href = "/shop.html";
}


// 🔥 초기 실행
loadData();