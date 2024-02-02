const express = require('express');
const mongoose = require('mongoose');
const axios = require('axios');
const cheerio = require('cheerio');
const flash = require('express-flash');
const session = require('express-session');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require('bcrypt');
const path = require('path');
const News = require('./models/collection');
const User = require('./models/User'); // Adjust the path accordingly
const authRouter = require('./routes/auth');


const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(flash());
app.use(session({
    secret: 'your-secret-key',
    resave: false,
    saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware for CORS
app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    next();
});

// MongoDB Connection
mongoose.connect("mongodb://0.0.0.0:27017/fortask");

// Passport Configuration
passport.use(new LocalStrategy(
    async (username, password, done) => {
        try {
            const user = await User.findOne({ username });
            if (!user) {
                return done(null, false, { message: 'Incorrect username.' });
            }
            const isPasswordValid = await bcrypt.compare(password, user.password);
            if (!isPasswordValid) {
                return done(null, false, { message: 'Incorrect password.' });
            }
            return done(null, user);
        } catch (error) {
            return done(error);
        }
    }
));

passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser((id, done) => {
    User.findById(id)
        .then(user => done(null, user))
        .catch(err => done(err, null));
});

// Crawling script
const crawlHackerNews = async () => {
    try {
        const response = await axios.get('https://news.ycombinator.com/');

        const $ = cheerio.load(response.data);
        //console.log($);

        const newsItems = [];
        //console.log($.html());

        $('.itemlist .athing').each((index, element) => {
            console.log($(element).html()); // Log the HTML content of each selected element
            // Rest of the code...
        });



        $('tr.athing').each((index, element) => {
            const title = $(element).find('.title a').text();

            const url = $(element).find('.title a').attr('href');
            const hacker_news_url = `https://news.ycombinator.com/${url}`;
            //const posted_on = timestamp ? new Date(timestamp) : null;
            const posted_on = $(element).next().find('.age').text().trim();


            // Check if posted_on is a valid date before updating the database

            const upvotes = parseInt($(element).find('.score').text().trim(), 10) || 0;  // Change here
            const comments = parseInt($(element).find('a:contains("comments")').text().trim(), 10) || 0;  // Change here
            const newsItem = {
                url,
                title,
                hacker_news_url,
                posted_on,
                upvotes,
                comments,
            };
            newsItems.push(newsItem);
        });


        //console.log(newsItems);




        for (const item of newsItems) {
            await News.findOneAndUpdate(
                { url: item.url },
                {
                    $set: {
                        title: item.title,  // Include the title update
                        upvotes: item.upvotes,
                        comments: item.comments,
                        posted_on: item.posted_on,
                    },
                },
                { upsert: true, new: true }
            );
        }





        console.log('Crawling completed!');
    } catch (error) {
        console.error('Error crawling HackerNews:', error);
    }
};

// Endpoint to trigger crawling and updating news items
app.get('/crawl', async (req, res) => {
    try {
        await crawlHackerNews();
        res.send('Crawling completed!');
    } catch (error) {
        console.error('Error crawling HackerNews:', error);
        res.status(500).send('Internal Server Error');
    }
});

app.get('/login', (req, res) => {
    res.render('login');
});

// Dashboard route
// Dashboard route
app.get('/dashboard', async (req, res) => {
    try {
        // Fetch the newsItems from the database
        const newsItems = await News.find();
        console.log(newsItems);
        // Render the dashboard template with the fetched newsItems
        res.render('dashboard', { user: req.user, newsItems });
    } catch (error) {
        console.error('Error fetching newsItems:', error);
        res.status(500).send('Internal Server Error');
    }
});
app.post('/dashboard/mark-read/:id', async (req, res) => {
    try {
        await News.findByIdAndUpdate(req.params.id, { $set: { isRead: true } });
        res.redirect('/dashboard');
    } catch (error) {
        console.error('Error marking news as read:', error);
        res.status(500).send('Internal Server Error');
    }
});
app.get('/logout', (req, res) => 

    req.logout((err) => {
        if (err) {
            return next(err);
        }
        // Redirect or respond after successful logout
        res.redirect('/dashboard');
    });
});


// Delete
app.post('/dashboard/delete/:id', async (req, res) => {
    try {
        await News.findByIdAndUpdate(req.params.id, { $set: { isDeleted: true } });
        res.redirect('/dashboard');
    } catch (error) {
        console.error('Error deleting news:', error);
        res.status(500).send('Internal Server Error');
    }
});


// Use the authentication router
app.use(authRouter);

// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, async () => {
    console.log(`Server is running on port ${PORT}`);
    await crawlHackerNews(); // Crawling on server start
});
