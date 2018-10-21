(function() {
  //*****/
  planetaryjs.plugins.objects = function(config) {
    var objects = [];
    config = config || {};

    var addObject = function(lng, lat, options) {
      options = options || {};
      
      options.speed = options.speed || config.speed || 0;
      options.imagesrc = options.imagesrc || config.imagesrc || "";
      options.imagewidth = options.imagewidth || config.imagewidth || 50;
      options.imageheight = options.imageheight || config.imageheight || 50;
      options.fade = options.fade || config.fade || false;

      var ping = { time: new Date(), options: options };
      if (config.latitudeFirst) {
        ping.lat = lng;
        ping.lng = lat;
      } else {
        ping.lng = lng;
        ping.lat = lat;
      }
      objects.push(ping);
    };

    var drawobjects = function(planet, context, now) {
      var newobjects = [];
      for (var i = 0; i < objects.length; i++) {
        var object = objects[i];
        var timechange = now - object.time;
        newobjects.push(object);
        drawobject(planet, context, now, timechange, object);
        
      }
      objects = newobjects;
    };

    var drawobject = function(planet, context, now, timechange, object) {
      
      //If Speed is greater than 0 animate object on lng/x axis
      var newlng = 0
      if(object.options.speed > 0){
        var xmove = (timechange*(object.options.speed))/100;
        newlng = (object.lng+xmove)
      } else {
        newlng = object.lng
      }
      
      //Get Spherical Coords from lat lng
      var coords = planet.projection([newlng, object.lat])  
      var img = new Image()
      img.src = object.options.imagesrc;
      

      var geoangle = d3.geo.distance([newlng, object.lat],[-planet.projection.rotate()[0], -planet.projection.rotate()[1]]);

      //closeness used for fading
      var closeness = 1.57079632679490 - geoangle;

      if (geoangle > 1.57079632679490)
      {
          //Behind Sphere > 90 degrees
      } else {

         var imagewidth = object.options.imagewidth;
         var imageheight = object.options.imageheight;

         if(object.options.fade == true){
           if(closeness < 0.1){
            context.globalAlpha = closeness*10;
           }
         }

         context.drawImage(img, (coords[0]-(imagewidth/2)) ,(coords[1]-(imageheight/2)), imagewidth ,imageheight)
         context.globalAlpha = 1
         //If fade is true fade out and in
      }
    };

    return function (planet) {
      planet.plugins.objects = {
        add: addObject,
        objectList: objects
      };

      planet.onDraw(function() {
           planet.plugins.objects = {
            add: addObject,
            objectList: objects
          };

        var now = new Date();
        planet.withSavedContext(function(context) {
          drawobjects(planet, context, now);
        });
      });
    };
  };
  //planet.loadPlugin(planetaryjs.plugins.objects());		
  //planet.plugins.objects.add(-1.3167103, 50.6927176, { imagesrc:"wizard.png" });
  //*****/
  var globe = planetaryjs.planet();
  // Load our custom `autorotate` plugin; see below.
  globe.loadPlugin(autorotate(5));
  // The `earth` plugin draws the oceans and the land; it's actually
  // a combination of several separate built-in plugins.
  //
  // Note that we're loading a special TopoJSON file
  // (world-110m-withlakes.json) so we can render lakes.
  globe.loadPlugin(planetaryjs.plugins.earth({
    topojson: { file:   'world-110m-withlakes.json' },
    oceans:   { fill:   '#000080' },
    land:     { fill:   '#339966' },
    borders:  { stroke: '#008000' }
  }));
  // Load our custom `lakes` plugin to draw lakes; see below.
  globe.loadPlugin(lakes({
    fill: '#000080'
  }));
  // The `pings` plugin draws animated pings on the globe.
  globe.loadPlugin(planetaryjs.plugins.pings());
  // Adding pictures to the planet.
  // The `zoom` and `drag` plugins enable
  // manipulating the globe with the mouse.
  globe.loadPlugin(planetaryjs.plugins.zoom({
    scaleExtent: [100, 300]
  }));
  globe.loadPlugin(planetaryjs.plugins.drag({
    // Dragging the globe should pause the
    // automatic rotation until we release the mouse.
    onDragStart: function() {
      this.plugins.autorotate.pause();
    },
    onDragEnd: function() {
      this.plugins.autorotate.resume();
    }
  }));
  // Set up the globe's initial scale, offset, and rotation.
  globe.projection.scale(220).translate([400, 230]).rotate([0, -10, 0]);

  // Every few hundred milliseconds, we'll draw another random ping.
  var colors = ['red', 'yellow', 'white', 'orange', 'green', 'cyan', 'pink'];
  setInterval(function() {
    var lat = Math.random() * 170 - 85;
    var lng = Math.random() * 360 - 180;
    var color = colors[Math.floor(Math.random() * colors.length)];
    globe.plugins.pings.add(lng, lat, { color: color, ttl: 2000, angle: Math.random() * 10 });
  }, 150);

  var canvas = document.getElementById('rotatingGlobe');
  // Special code to handle high-density displays (e.g. retina, some phones)
  // In the future, Planetary.js will handle this by itself (or via a plugin).
  if (window.devicePixelRatio == 2) {
    canvas.width = 800;
    canvas.height = 800;
    context = canvas.getContext('2d');
    context.scale(2, 2);
  }
  // Draw that globe!
  globe.draw(canvas);

  // This plugin will automatically rotate the globe around its vertical
  // axis a configured number of degrees every second.
  function autorotate(degPerSec) {
    // Planetary.js plugins are functions that take a `planet` instance
    // as an argument...
    return function(planet) {
      var lastTick = null;
      var paused = false;
      planet.plugins.autorotate = {
        pause:  function() { paused = true;  },
        resume: function() { paused = false; }
      };
      // ...and configure hooks into certain pieces of its lifecycle.
      planet.onDraw(function() {
        if (paused || !lastTick) {
          lastTick = new Date();
        } else {
          var now = new Date();
          var delta = now - lastTick;
          // This plugin uses the built-in projection (provided by D3)
          // to rotate the globe each time we draw it.
          var rotation = planet.projection.rotate();
          rotation[0] += degPerSec * delta / 1000;
          if (rotation[0] >= 180) rotation[0] -= 360;
          planet.projection.rotate(rotation);
          lastTick = now;
        }
      });
    };
  };

  // This plugin takes lake data from the special
  // TopoJSON we're loading and draws them on the map.
  function lakes(options) {
    options = options || {};
    var lakes = null;

    return function(planet) {
      planet.onInit(function() {
        // We can access the data loaded from the TopoJSON plugin
        // on its namespace on `planet.plugins`. We're loading a custom
        // TopoJSON file with an object called "ne_110m_lakes".
        var world = planet.plugins.topojson.world;
        lakes = topojson.feature(world, world.objects.ne_110m_lakes);
      });

      planet.onDraw(function() {
        planet.withSavedContext(function(context) {
          context.beginPath();
          planet.path.context(context)(lakes);
          context.fillStyle = options.fill || 'black';
          context.fill();
        });
      });
    };
  };
})();