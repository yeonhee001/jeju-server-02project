const express = require('express');
const like = express.Router();
const { MongoClient, ObjectId } = require('mongodb');

const uri = process.env.MONGODB || "mongodb://localhost:27017";
const client = new MongoClient(uri);
let collection;
let postCollection;

async function connectDB() {
  if (!collection || !postCollection) {
    await client.connect();
    const db = client.db('JejuDB');
    collection = db.collection('like');
    postCollection = db.collection('post');
  }
}

// POST /like - 좋아요 상태 업데이트 및 게시물 저장
like.post('/', async (req, res) => {
  try {
    await connectDB();

    const { postId, userId, liked, post } = req.body;

    if (!postId || !userId) {
      return res.status(400).json({ error: "postId와 userId가 필요합니다." });
    }

    const filter = { postId, userId };

    if (liked) {
      const post = await postCollection.findOne({ _id: new ObjectId(postId) });

      if (!post) {
        return res.status(404).json({ error: "게시물을 찾을 수 없습니다." });
      }

      const likeDoc = {
        postId,
        userId,
        liked: true,
        post: post || {},
        createdAt: new Date()
      };

      await collection.updateOne(filter, { $set: likeDoc }, { upsert: true });

      await postCollection.updateOne(
        { _id: new ObjectId(postId) },
        { $inc: { likeCount: 1 } }
      );
    } else {
      await collection.deleteOne(filter);

      await postCollection.updateOne(
        { _id: new ObjectId(postId) },
        { $inc: { likeCount: -1 } }
      );
    }

    res.status(200).json({ message: "좋아요 상태가 업데이트되었습니다." });
  } catch (error) {
    console.error("좋아요 업데이트 오류:", error);
    res.status(500).json({ error: "서버 오류" });
  }
});

// GET /like - 유저의 좋아요 상태 가져오기
like.get('/', async (req, res) => {
  try {
    await connectDB();

    const { postId, userId } = req.query;

    if (!postId || !userId) {
      return res.status(400).json({ error: "postId와 userId가 필요합니다." });
    }

    const result = await collection.findOne({ postId, userId });
    res.status(200).json({ liked: result?.liked || false });
  } catch (error) {
    console.error("좋아요 상태 조회 오류:", error);
    res.status(500).json({ error: "서버 오류" });
  }
});

// GET /like/count - 좋아요 수 가져오기
like.get('/count', async (req, res) => {
  try {
    await connectDB();

    const { postId } = req.query;

    if (!postId) {
      return res.status(400).json({ error: "postId가 필요합니다." });
    }

    const count = await collection.countDocuments({ postId, liked: true });
    res.status(200).json({ count });
  } catch (error) {
    console.error("좋아요 개수 조회 오류:", error);
    res.status(500).json({ error: "서버 오류" });
  }
});

// GET /like/user-liked - 로그인한 사용자가 좋아요 누른 게시물 목록 가져오기
like.get('/user-liked', async (req, res) => {
  try {
    await connectDB();

    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ error: "userId가 필요합니다." });
    }

    // userId로 좋아요한 목록 조회
    const likedPosts = await collection
      .find({ userId })
      .toArray();

    // 해당하는 likedPostId 배열을 리턴
    // const likedPostIds = likedPosts.map(like => like.postId);
    // 클라이언트에 응답
    res.status(200).json({ likedPosts });
  } catch (error) {
    console.error("좋아요한 게시물 조회 오류:", error);
    res.status(500).json({ error: "서버 오류" });
  }
});

module.exports = like;