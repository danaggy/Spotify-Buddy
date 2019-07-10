/**
 * This is an example of a basic node.js script that performs
 * the Authorization Code oAuth2 flow to authenticate against
 * the Spotify Accounts.
 *
 * For more information, read
 * https://developer.spotify.com/web-api/authorization-guide/#authorization_code_flow
 */

var express = require('express'); // Express web server framework
var request = require('request'); // "Request" library
var cors = require('cors');
var querystring = require('querystring');
var cookieParser = require('cookie-parser');

var client_id = 'fc500412184143218fc46f06a915f88f'; // Your client id
var client_secret = 'b7223add2aea40428b3988af16f97220'; // Your secret
var redirect_uri = 'http://localhost:8888/callback'; // Your redirect uri

/**
 * Generates a random string containing numbers and letters
 * @param  {number} length The length of the string
 * @return {string} The generated string
 */
var generateRandomString = function(length) {
  var text = '';
  var possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

  for (var i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
};

var stateKey = 'spotify_auth_state';

var app = express();

app.use(express.static(__dirname + '/public'))
   .use(cors())
   .use(cookieParser());

app.get('/login', function(req, res) {

  var state = generateRandomString(16);
  res.cookie(stateKey, state);

  // your application requests authorization
  var scope = 'user-read-private user-read-email user-top-read playlist-modify-public playlist-modify-private';
  res.redirect('https://accounts.spotify.com/authorize?' +
    querystring.stringify({
      response_type: 'code',
      client_id: client_id,
      scope: scope,
      redirect_uri: redirect_uri,
      state: state
    }));
});

app.get('/callback', function(req, res) {

  // your application requests refresh and access tokens
  // after checking the state parameter
  var code = req.query.code || null;
  var state = req.query.state || null;
  var storedState = req.cookies ? req.cookies[stateKey] : null;

  if (state === null || state !== storedState) {
    res.redirect('/#' +
      querystring.stringify({
        error: 'state_mismatch'
      }));
  } else {
    res.clearCookie(stateKey);
    var authOptions = {
      url: 'https://accounts.spotify.com/api/token',
      form: {
        code: code,
        redirect_uri: redirect_uri,
        grant_type: 'authorization_code'
      },
      headers: {
        'Authorization': 'Basic ' + (new Buffer(client_id + ':' + client_secret).toString('base64'))
      },
      json: true
    };

    request.post(authOptions, function(error, response, body) {
      if (!error && response.statusCode === 200) {
        var access_token = body.access_token,
            refresh_token = body.refresh_token;

        var options = {
          url: 'https://api.spotify.com/v1/me',
          headers: { 'Authorization': 'Bearer ' + access_token },
          json: true
        };
        
        // use the access token to access the Spotify Web API
        // get the current user profile
        request.get(options, function(error, response, body) {
          
          // user_href is https://api.spotify.com/v1/users/userId
          var user_href = body.href;
          
          //createLongPlaylist(access_token, user_href);
          //createMedPlaylist(access_token, user_href);
          //createShortPlaylist(access_token, user_href);
        });

       
        
        // we can also pass the token to the browser to make requests from there
        res.redirect('/#' +
          querystring.stringify({
            access_token: access_token,
            refresh_token: refresh_token
          }));
      } else {
        res.redirect('/#' +
          querystring.stringify({
            error: 'invalid_token'
          }));
      }
    });
  }
});

app.get('/refresh_token', function(req, res) {

  // requesting access token from refresh token
  var refresh_token = req.query.refresh_token;
  var authOptions = {
    url: 'https://accounts.spotify.com/api/token',
    headers: { 'Authorization': 'Basic ' + (new Buffer(client_id + ':' + client_secret).toString('base64')) },
    form: {
      grant_type: 'refresh_token',
      refresh_token: refresh_token
    },
    json: true
  };

  request.post(authOptions, function(error, response, body) {
    if (!error && response.statusCode === 200) {
      var access_token = body.access_token;
      res.send({
        'access_token': access_token
      });
    }
  });
});

function createLongPlaylist(access_token, user_href){
  var playlistOptions = {
        url: user_href + '/playlists',
        headers: {
           'Authorization': 'Bearer ' + access_token,
           'contentType': 'application/json'
        },
        body: JSON.stringify({name: "Top Tracks(All Time)", public: false})
  }
  request.post(playlistOptions, function(err, resp, body){
            var parsedBody = JSON.parse(body); 
            var playlist_id = parsedBody.id
            var options = {
                  url: 'https://api.spotify.com/v1/me/top/tracks?time_range=long_term&limit=50',
                  headers: { 'Authorization': 'Bearer ' + access_token },
                  json: true
            };
            request.get(options, function(error, response, body) {
                  var trackUris = [];
                  trackList = body.items;
                  for(var i = 0; i < trackList.length; i++){
                    var trackObj = trackList[i]; 
                    trackUris[i] = trackObj.uri;
                  }
                  var trackOptions = {
                    url: user_href + '/playlists/' + playlist_id + "/tracks",
                    headers: {
                        'Authorization': 'Bearer ' + access_token,
                        'contentType': 'application/json'
                    },
                    body:{
                      'uris': trackUris
                    },
                    json: true 
                  };
                  request.post(trackOptions,function(error,response,body){
                    console.log("created long term");
                  });
            });
    });
}

function createMedPlaylist(access_token, user_href){
  var playlistOptions = {
        url: user_href + '/playlists',
        headers: {
           'Authorization': 'Bearer ' + access_token,
           'contentType': 'application/json'
        },
        body: JSON.stringify({name: "Top Tracks(Med Term)", public: false})
  }
  request.post(playlistOptions, function(err, resp, body){
            var parsedBody = JSON.parse(body); 
            var playlist_id = parsedBody.id
            var options = {
                  url: 'https://api.spotify.com/v1/me/top/tracks?time_range=medium_term&limit=50',
                  headers: { 'Authorization': 'Bearer ' + access_token },
                  json: true
            };
            request.get(options, function(error, response, body) {
                  var trackUris = [];
                  trackList = body.items;
                  for(var i = 0; i < trackList.length; i++){
                    var trackObj = trackList[i]; 
                    trackUris[i] = trackObj.uri;
                  }
                  var trackOptions = {
                    url: user_href + '/playlists/' + playlist_id + "/tracks",
                    headers: {
                        'Authorization': 'Bearer ' + access_token,
                        'contentType': 'application/json'
                    },
                    body:{
                      'uris': trackUris
                    },
                    json: true 
                  };
                  request.post(trackOptions,function(error,response,body){
                    console.log("created med term");
                  });
            });
    });
}

function createShortPlaylist(access_token, user_href){
  var playlistOptions = {
        url: user_href + '/playlists',
        headers: {
           'Authorization': 'Bearer ' + access_token,
           'contentType': 'application/json'
        },
        body: JSON.stringify({name: "Top Tracks(Short Term)", public: false})
  }
  request.post(playlistOptions, function(err, resp, body){
            var parsedBody = JSON.parse(body); 
            var playlist_id = parsedBody.id
            var options = {
                  url: 'https://api.spotify.com/v1/me/top/tracks?time_range=short_term&limit=50',
                  headers: { 'Authorization': 'Bearer ' + access_token },
                  json: true
            };
            request.get(options, function(error, response, body) {
                  var trackUris = [];
                  trackList = body.items;
                  for(var i = 0; i < trackList.length; i++){
                    var trackObj = trackList[i]; 
                    trackUris[i] = trackObj.uri;
                  }
                  var trackOptions = {
                    url: user_href + '/playlists/' + playlist_id + "/tracks",
                    headers: {
                        'Authorization': 'Bearer ' + access_token,
                        'contentType': 'application/json'
                    },
                    body:{
                      'uris': trackUris
                    },
                    json: true 
                  };
                  request.post(trackOptions,function(error,response,body){
                    console.log("created short term");
                  });
            });
    });
}
console.log('Listening on 8888');

app.listen(8888);