getPage();

async function getPage() {
  const response = await fetch('/getListFiles');
  const listFiles = await response.json();
  const files = document.getElementById('listfiles');
  listFiles.forEach((e) => {
    const div = document.createElement('div');
    const btn = document.createElement('button');
    const btn2 = document.createElement('button');
    const btn3 = document.createElement('button');
    btn.innerText = `Файл: ${e.fileName}`;
    btn2.innerText = 'Скачать';
    btn3.innerText = 'Добавить комментарий';
    btn2.onclick = () => fileDownload(e.fileName);
    div.appendChild(btn);
    div.appendChild(btn2);
    div.appendChild(btn3);
    files.appendChild(div);
  });
}

async function fileDownload(fileName) {
  const response = await fetch('/download', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ fileName }),
  });
}
