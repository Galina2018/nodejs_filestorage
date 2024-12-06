const express = require('express');
const path = require('path');
const fs = require('fs');
// const mime = require('mime/lite');
// const mime = require('mime');
const multer = require('multer');
const WebSocket = require('ws');
const bodyParser = require('body-parser');

const webserver = express();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, 'public'));
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname);
  },
});
const upload = multer({ storage: storage });
const port = 7380;

webserver.use(bodyParser.text({}));
webserver.use(bodyParser.json({}));
webserver.use(express.urlencoded({ extended: true }));
webserver.use(express.static(path.resolve(__dirname, 'public')));

webserver.get('/', (req, res) => {
  const html = fs.readFileSync(path.resolve(__dirname, 'index.html'), 'utf8');
  res.send(html);
});

webserver.get('/getListFiles', (req, res) => {
  const listFiles = fs.readFileSync(
    path.resolve(__dirname, './public', 'list.json'),
    'utf8'
  );
  res.send(listFiles);
});

webserver.post('/download', (req, res) => {
  let filename = req.body;
  let filePath = path.resolve(__dirname, 'public', filename);
  // let mimetype = mime.getType(filename);
  res.setHeader('Content-disposition', 'attachment; filename=' + filename);
  // res.setHeader('Content-type', mimetype);
  res.download(filePath, (err) => {
    if (err) {
      res.status(500).send('Ошибка при скачивании файла');
    }
  });
});

webserver.post('/upload', upload.single('file'), (req, res) => {
  console.log(1);
  let clients = [];
  let timer = 0;
  const ws = new WebSocket.Server({ port: 7381 });
  console.log(2, ws.options.port);
  ws.on('connection', (connection) => {
    console.log(3);
    connection.send('hello from server to client!');
    let stats = 0;
    let progress = 0;
    let readStream = fs.createReadStream(req.file.originalname);
    let writeStream = fs.createWriteStream(
      path.join(__dirname, 'public', req.file.originalname)
    );
    readStream.pipe(writeStream);

    console.log(4);
    readStream.on('data', (chunk) => {
      // console.log(5);
      stats += chunk.length;
      progress = Math.floor((stats / req.file.size) * 100);
      connection.send(progress);
    });

    console.log(6);
    connection.on('message', (message) => {
      if (message === 'KEEP_ME_ALIVE') {
        clients.forEach((client) => {
          if (client.connection === connection)
            client.lastkeepalive = Date.now();
        });
      } else console.log('сервером получено сообщение от клиента: ' + message);
    });
    clients.push({ connection: connection, lastkeepalive: Date.now() });

    readStream.on('end', () => {
      console.log(7);
      connection.send(100);
      connection.send('Процесс закачивания файла завершен!');
      res.send('File uploaded successfully');
      const fd = path.resolve(__dirname, 'public', 'list.json');
      fs.readFile(fd, 'utf8', (err, arr) => {
        if (err) {
          console.error(err);
        } else {
          let data;
          try {
            data = JSON.parse(arr);
            data.push({ fileName: req.file.originalname, comments: [] });
          } catch (err) {
            console.error(err);
          }
          fs.writeFile(fd, JSON.stringify(data), (err) => {
            if (err) {
              console.error(err);
            } else {
              // console.log('Объект успешно добавлен');
            }
          });
        }
      });
      console.log(71);
      // res.send('File uploaded successfully');
      // res.end();
    });
  });
  console.log(8);

  setInterval(() => {
    console.log(9);
    timer++;
    clients.forEach((client) => {
      if (Date.now() - client.lastkeepalive > 12000) {
        client.connection.terminate();
        client.connection = null;
      } else client.connection.send('timer=' + timer);
    });
    clients = clients.filter((client) => client.connection);
  }, 3000);

  // res.send('File uploaded successfully');
});

webserver.post('/getComment', (req, res) => {
  const listFN = path.resolve(__dirname, 'public', 'list.json');
  const list = fs.readFileSync(listFN, 'utf8');
  let listObj = JSON.parse(list);
  let listItem = listObj.filter((e) => e.fileName === req.body);
  const text = listItem[0].comments;
  res.send(text);
});

webserver.post('/addComment', (req, res) => {
  const body = JSON.parse(req.body);
  const fileName = body.fileName;
  const listFN = path.resolve(__dirname, 'public', 'list.json');
  const list = fs.readFileSync(listFN, 'utf8');
  let listObj = JSON.parse(list);
  let listItem = listObj.filter((e) => e.fileName === fileName);
  listItem[0].comments.push(body.comment);
  fs.writeFileSync(listFN, JSON.stringify(listObj), 'utf8');
  res.send('Комментарий успешно добавлен!');
});

webserver.listen(port, () => console.log('webserver running on port ' + port));
