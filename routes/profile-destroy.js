module.exports = profileDestroy
var config = require('../config.js')


function profileDestroy (req, res) {
  switch (req.method) {
    case 'GET':
    case 'HEAD': return show(req, res)
    case 'POST': 
    case 'PUT': 
      req.maxLen = 1024 * 1024
      return req.on('form', function (data) {
        destroyThenRedirect(data, req, res)
      })
    default: return res.error(405)
  }
}

function show (req, res) {
  req.model.load('profile', req)
  req.model.end(function (er, m) {
    var profile = m.profile
    if (er || !profile || !profile.name) {
      req.session.set('done', req.url)
      return res.redirect('/login')
    }
    if (er || profile.error) {
      return res.error(er || profile.error)
    }
    var locals = {
      profile: profile,
      error: null
    }
    res.template("verify-destroy.ejs", locals)
  })
}


function destroyThenRedirect (data, req, res) {
   if (!data.name) {
    return res.error(new Error('name is required'), 400)
  }

  // get the user's own profile
  req.model.load('profile', req)
  req.model.end(function (er, m) {
    var prof = m.profile

    if (er || prof.error) {
      er.response = prof
      er.path = req.url
      res.session.set('error', er)
      res.session.set('done', req.url)
      return res.redirect('/login')
    }

    req.model.loadAs('browse', 'packages', 'author', data.name, 0, 10)

    req.model.end(function(er, m) {

     //Verify that the user has no more packages
     if( stillMaintainsPackages(m)) {
       var locals = {
         profile: prof,
         error: "You still have published modules, please unpublish them before deleting this profile. Clean it up."
       }

       return res.template("verify-destroy.ejs", locals)
     }

     req.couch.deleteAccount(data.name, function(er, cr, data) {
       if(er || data.error) {
         er = er || new Error(data.error)
         er.response = data
         er.path = req.url
         res.session.set('error', er)
         res.session.set('done', req.url)
         return res.redirect('/login')
       }

       //Logout user after deletion
       res.redirect('/logout')
     })
   })
  })
}

function stillMaintainsPackages (model){
    return  (model.packages && model.packages.length) ? true : false
}

