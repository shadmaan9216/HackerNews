const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const newsSchema = new Schema({
    title: String, // Add title field
    url: { type: String, index: true },
    hacker_news_url: String,
    posted_on: String,
    upvotes: Number,
    comments: Number,
    isRead: { type: Boolean, default: false },
    isDeleted: { type: Boolean, default: false }
});

const News = mongoose.model('taskk', newsSchema);

module.exports = News;
