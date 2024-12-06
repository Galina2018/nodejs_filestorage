getPage();

async function getPage() {
  const response = await fetch('/getListFiles');
  const listFiles = await response.json();
  const files = document.getElementById('listfiles');
  files.innerHTML = '';
  listFiles.forEach((e) => {
    const div = document.createElement('div');
    const btn1 = document.createElement('button');
    const btn2 = document.createElement('button');
    const btn3 = document.createElement('button');
    const btn4 = document.createElement('button');
    btn1.innerText = `Файл: ${e.fileName}`;
    btn2.innerText = 'Скачать';
    btn3.innerText = 'Добавить комментарий';
    btn4.innerText = 'Просмотреть комментарий';
    btn2.onclick = () => fileDownload(e.fileName);
    btn3.onclick = () => addBlockComment(e.fileName);
    btn4.onclick = () => showComment(e.fileName);
    div.appendChild(btn1);
    div.appendChild(btn2);
    div.appendChild(btn3);
    div.appendChild(btn4);
    files.appendChild(div);
  });
}

async function fileDownload(fileName) {
  const response = await fetch('/download', {
    method: 'POST',
    headers: {
      'Content-Type': 'text/plain',
    },
    body: fileName,
  });
  const data = await response.blob();
  var fakebtn = document.createElement('a');
  fakebtn.href = window.URL.createObjectURL(new Blob([data]));
  fakebtn.download = fileName;
  fakebtn.click();
}

const form = document.getElementById('uploadForm');
form.onsubmit = (evt) => fileUpload(evt);

async function fileUpload(evt) {
  evt.preventDefault();
  const form = document.getElementById('uploadForm');
  const file = document.getElementById('file');
  const fileProgress = document.getElementById('fileProgress');

  // const url = 'ws://localhost:7381';
  const url = 'ws://178.172.195.18:7381';
  let connection = new WebSocket(url);
  connection.onopen = (event) => {
    console.log(
      'Successfully CONNECTED to the echo websocket server...',
      event
    );
  };
  connection.onmessage = function(event) {
    console.log('клиентом получено сообщение от сервера: ' + event.data);
    if (Number.isFinite(+event.data)) fileProgress.value = +event.data;
    if (Number.isFinite(+event.data) && +event.data == 100) {
      console.log('Процесс закачивания файла завершен.');
      connection.close();
    }
  };
  connection.onerror = function(event) {
    console.log('websocket server error', event);
  };
  connection.onclose = function(event) {
    console.log('websocket server closed', event);
    connection = null;
    clearInterval(keepAliveTimer);
    keepAliveTimer = null;
    fileProgress.value = 0;
    getPage();
  };
  let keepAliveTimer = setInterval(() => {
    connection.send('KEEP_ME_ALIVE');
  }, 5000);

  try {
    await fetch('/upload', {
      method: 'POST',
      body: new FormData(form),
    });
    file.value = '';
  } catch (error) {
    console.error('Ошибка при загрузке файла:', error);
  }
}

async function showComment(fileName) {
  const labelForComment = document.getElementById('labelForComment');
  labelForComment.classList.remove('hidden');
  labelForComment.innerHTML = `Комментарий для ${fileName}`;
  const comment = document.getElementById('comment');
  comment.classList.remove('hidden');

  const response = await fetch('/getComment', {
    method: 'POST',
    body: fileName,
  });
  const res = await response.text();
  const commentText = JSON.parse(res).join('\n\n');
  comment.value = commentText;
  comment.disabled = true;
}

function addBlockComment(fileName) {
  const labelForComment = document.getElementById('labelForComment');
  labelForComment.innerHTML = `Здесь можно добавить комментарий для ${fileName}`;
  labelForComment.value = fileName;
  labelForComment.classList.remove('hidden');
  const comment = document.getElementById('comment');
  comment.value = '';
  comment.classList.remove('hidden');
  comment.disabled = false;
  const btnAddComment = document.getElementById('btnAddComment');
  btnAddComment.classList.remove('hidden');
}

async function addComment() {
  const labelForComment = document.getElementById('labelForComment');
  const comment = document.getElementById('comment');
  const btnAddComment = document.getElementById('btnAddComment');
  labelForComment.classList.add('hidden');
  comment.classList.add('hidden');
  btnAddComment.classList.add('hidden');

  await fetch('/addComment', {
    method: 'POST',
    body: JSON.stringify({
      fileName: labelForComment.value,
      comment: comment.value,
    }),
  });
}
