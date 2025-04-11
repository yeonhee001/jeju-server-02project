const express = require('express');
const multer = require('multer');
const path = require('path');
const post = express.Router();
const { MongoClient, ObjectId } = require('mongodb');
const uri = process.env.MONGODB;
const client = new MongoClient(uri);

let postCollection;
let commentCollection;

// DB 연결 함수
async function dataCtrl() {
  if (!client.topology || !client.topology.isConnected()) {
    await client.connect();
  }
  const db = client.db('JejuDB');
  postCollection = db.collection('post');
  commentCollection = db.collection('comments');
}

// multer 설정: 이미지 업로드 처리
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/'); // 업로드 폴더 설정
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname)); // 파일 이름에 타임스탬프 추가
  }
});

const upload = multer({ storage: storage });

// 새 글 등록 (이미지 포함)
post.post('/', upload.single('image'), async (req, res) => {
  await dataCtrl();
  try {
    const postData = {
      ...req.body,
      createdAt: new Date().toISOString(),
      imageUrl: req.file ? `/uploads/${req.file.filename}` : null, // 이미지 URL 저장
    };
    const result = await postCollection.insertOne(postData);
    res.json({ message: '등록 성공', id: result.insertedId });
  } catch (error) {
    console.error('등록 실패:', error);
    res.status(500).json({ message: '등록 실패', error });
  }
});

// 게시글 목록 조회
post.get('/', async (req, res) => {
  await dataCtrl();
  try {
    const posts = await postCollection.find().toArray();
    res.json(posts);
  } catch (error) {
    console.error('조회 실패:', error);
    res.status(500).json({ message: '조회 실패', error });
  }
});

// 게시글 단건 조회
post.get('/:id', async (req, res) => {
  await dataCtrl();
  const { id } = req.params;
  try {
    const postItem = await postCollection.findOne({ _id: new ObjectId(id) });
    if (!postItem) {
      return res.status(404).json({ message: '게시글을 찾을 수 없습니다.' });
    }
    res.json(postItem);
  } catch (error) {
    console.error('게시글 조회 실패:', error);
    res.status(500).json({ message: '게시글 조회 실패', error });
  }
});

// 게시글 수정
post.put('/:id', async (req, res) => {
  await dataCtrl();
  const { id } = req.params;
  const updatedPost = req.body;

  try {
    // id가 잘못된 형식일 경우 대비
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ message: '유효하지 않은 ID 형식입니다.' });
    }

    const { _id, createdAt, ...fieldsToUpdate } = updatedPost;

    const result = await postCollection.updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          ...fieldsToUpdate,
          updatedAt: new Date().toISOString(),
        },
      }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ message: '게시글을 찾을 수 없습니다.' });
    }

    res.json({ message: '게시글 수정 성공' });
  } catch (error) {
    console.error('게시글 수정 실패:', error);
    res.status(500).json({ message: '게시글 수정 실패', error });
  }
});

// 게시글 삭제
post.delete('/:id', async (req, res) => {
  await dataCtrl();
  const { id } = req.params;

  try {
    // id가 잘못된 형식일 경우 대비
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ message: '유효하지 않은 ID 형식입니다.' });
    }

    // 게시글 삭제
    const result = await postCollection.deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
      return res.status(404).json({ message: '게시글을 찾을 수 없습니다.' });
    }

    // 게시글이 삭제된 후 해당 게시글에 대한 댓글도 삭제
    await commentCollection.deleteMany({ postId: id });

    res.json({ message: '게시글 삭제 성공' });
  } catch (error) {
    console.error('게시글 삭제 실패:', error);
    res.status(500).json({ message: '게시글 삭제 실패', error });
  }
});

// 댓글 등록
post.post('/comment', async (req, res) => {
  await dataCtrl();
  const { postId, userId, username, text } = req.body;

  try {
    const result = await commentCollection.insertOne({
      postId,
      userId,
      username,
      text,
      createdAt: new Date().toISOString(),
    });
    res.json({ message: '댓글 등록 성공', id: result.insertedId });
  } catch (error) {
    console.error('댓글 등록 실패:', error);
    res.status(500).json({ message: '댓글 등록 실패', error });
  }
});

// 특정 게시물의 댓글 조회
post.get('/comment/:postId', async (req, res) => {
  await dataCtrl();
  const { postId } = req.params;

  try {
    const comments = await commentCollection.find({ postId }).toArray();
    res.json(comments);
  } catch (error) {
    console.error('댓글 조회 실패:', error);
    res.status(500).json({ message: '댓글 조회 실패', error });
  }
});

module.exports = post;