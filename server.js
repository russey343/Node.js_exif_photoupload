const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const fs = require('fs');
const MongoClient = require('mongodb').MongoClient;
const dbName = 'uploadjpg';
const mongoDBurl ='mongodb+srv://rus:rus123@cluster0-ynycb.mongodb.net/test?retryWrites=true&w=majority';
const multer = require('multer');
const ExifImage = require('exif').ExifImage;
app.set('view engine','ejs');

var storage = multer.diskStorage({
	destination: function (req, file, cb) {
	  cb(null, 'uploads')
	},
	filename: function (req, file, cb) {
	  cb(null, file.fieldname + '-' + Date.now())
	}
  })
  
  var upload = multer({ storage: storage })

// support parsing of application/json type post data
app.use(bodyParser.json());
// support parsing of application/x-www-form-urlencoded post data
app.use(bodyParser.urlencoded({ extended: true }));

app.get('/', (req,res) => {
		return res.redirect('/initial');		
		
});

app.get('/detail', (req,res) => {
		MongoClient.connect(mongoDBurl, { useNewUrlParser: true }, function(err, db) {
			if (err) throw err;
			var dbo = db.db("uploadjpg");						
			dbo.collection("uploadjpg").find().toArray(function(err, result) {
				if (err)throw err;
				var newdata = "data:";
				var newdata2 = ";base64, ";

				var newimg = newdata + result[0].mimetype + newdata2 + result[0].image ;				
				db.close();	
				return res.status(200).render('detail',{
					title:result[0].title,
					description:result[0].description,
					make:result[0].make,
					model:result[0].model,
					date:result[0].date,
					lat:result[0].lat,
					lon:result[0].lon,					
					newimg:newimg
					});
		});	
	});
});


app.get('/uploadnew', (req,res) => {	//insert page
	res.status(200).sendFile(__dirname + '/public/uploadnew.html');
});

//insert funcution
app.post('/uploadnew_jpg', upload.single('picture'), (req,res) => {
			MongoClient.connect(mongoDBurl, { useNewUrlParser: true }, function(err, db) {
	  if (err) throw err;
		  var title  = req.body.title; 
		  var description	= req.body.description;
		  var img = fs.readFileSync(req.file.path);


		  var make,model,date;
		  var latDegree,latMinute,latSecond,latDirection;
		  var lonDegree,lonMinute,lonSecond,lonDirection;
		  var lat,lon;
			
		  try {
			new ExifImage({ image : img }, function (error, exifData) {
				if (error)
					console.log('Error: '+error.message);
				else
					console.log(exifData); // Do something with your data!

					make = exifData.image.Make;
					model = exifData.image.Model;
					date = exifData.exif.CreateDate;
					latDegree  = exifData.gps.GPSLatitude[0];
					latMinute = exifData.gps.GPSLatitude[1];
					latSecond = exifData.gps.GPSLatitude[2];
					latDirection = exifData.gps.GPSLatitudeRef;
					lonDegree = exifData.gps.GPSLongitude[0];
					lonMinute = exifData.gps.GPSLongitude[1];
					lonSecond = exifData.gps.GPSLongitude[2];
					lonDirection = exifData.gps.GPSLongitudeRef;
					
					//console.log(latDegree, latMinute, latSecond, latDirection);
					//console.log(lonDegree, lonMinute, lonSecond, lonDirection);

					function ConvertDMSToDD(degrees, minutes, seconds, direction) {
						var dd = degrees + (minutes/60) + (seconds/3600);
						if (direction == "S" || direction == "W") {
							dd = dd * -1; 
						}
						return dd;
					}
					lat = ConvertDMSToDD(latDegree, latMinute, latSecond, latDirection);
					lon = ConvertDMSToDD(lonDegree, lonMinute, lonSecond, lonDirection);
					/*console.log(lat);
					console.log(lon);					
					console.log(make +  model + date);	*/
				
					var data =  {			  
						"title": title,
						"description": description, 
						"make":make,
						"model":model,
						"date":date,
						"lat":lat,
						"lon":lon,
						"mimetype": req.file.mimetype,
						"image":new Buffer.from(img).toString('base64')	
						};			  						
							var dbo = db.db("uploadjpg");
								dbo.collection('uploadjpg').insertOne(data,function(err,){ 
								if (err) throw err; 
								console.log("Upload Success");
								return res.redirect('/detail');  
					});		
			});
		
		} catch (error) {
			console.log('Error: ' + error.message);
		}
  });	 
});

app.get('/map/:lat/:lon/', (req,res) => {
	MongoClient.connect(mongoDBurl, { useNewUrlParser: true }, function(err, db) {
		if (err) throw err;
		var dbo = db.db("uploadjpg");		
		dbo.collection("uploadjpg").find().toArray(function(err, result) {
			if (err)throw err;
			//console.log(result[0].title);
			//console.log(result[0].lat + result[0].lon);
			return res.status(200).render('leaflet',{
				lat:result[0].lat,
				lon:result[0].lon
			});	
		});		
	});	
});

app.get('/initial', (req,res) => {
	MongoClient.connect(mongoDBurl, { useNewUrlParser: true }, function(err, db) {
		if (err) throw err;
		var dbo = db.db("uploadjpg");
				dbo.collection("uploadjpg").deleteMany(function(err, result) {
				if (err)throw err;
				console.log("initial success")
				db.close();	
				return res.redirect('/uploadnew');
			});	
				
	});	
});


app.listen(process.env.PORT || 8099);
