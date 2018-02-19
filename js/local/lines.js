// Here are the PlotLines models.
// If a checkbox is checked the corresponding element should plot.

// Simple helper to call console.log. Makes it easy to disable logging.
function logMessage(messageToLog){
//	console.log(messageToLog);
}

var ElementsToPlot = Backbone.Model.extend({
		// Default todo attribute values
	defaults : {
		title : '',
		doPlot : false,
		strokeColor : "black",
		// Our arrays are always points, so will be 2xNumElements in size.
		// This is the raw data, scaling applied in views.
		points : [[0, 0]],
		idMHD : 0,
		// this is a window independent scale factor, i.e we want to be 10 times greater than actual. 
		// For the actual drawing we will have to multiply this by a conversion that will fit the item in the canvas
		// These scale values belong to the model and are useful to accomodate greatly
		// varying scales for different plots.
		// The scaling works so that a value of 2 will fill the canvas.
		// Usually the x-axis is in the middle of the canvas, so a y value of 1 will
		// be at the top of the canvas.
		// yScale should be set to get a maximum value near 1 to get a full size plot.
		// xScale : 1,  no need for xScale, we know the largest x, it's in the points array and won't change.
		yScale : 1,
		yMinScale : 0,
		yMaxScale : 10, // expected max Y. Used to set max for slider. Can be dynamically adjusted if needed.
	},
	initialize : function () {
		this.on('change:doPlot', function () {
			var debugBreak = 0;
		});
		this.on('change:points', function () {
			var debugBreak = 0;
		});
	},
});

var ElementsToPlotCollection = Backbone.Collection.extend({
	model : ElementsToPlot,
		
	//overriding the fetch method. normally fetch() grabs a resultset from a REST server
	fetch : function() {
		this.reset([
			{
				idMHD : pressureId,
				title : "Pressure",
				strokeColor : "fuchsia", // put the color here so it's easy to get from different views etc.
				yMaxScale : 200,
			},
			{
				idMHD : densId,
				title : "Dens",
				strokeColor : "purple",
				yMaxScale : 200,
			},
			{
				idMHD : bzId,
				title : "Bz",
				strokeColor : "navy",
				yMaxScale : 200,
			},
			{
				idMHD : byId,
				title : "By",
				strokeColor : "lime",
				yMaxScale : 10,
			},
			{
				idMHD : vzId,
				title : "Vz",
				strokeColor : "green",
				yMaxScale : 200,
			},

			{
				idMHD : vyId,
				title : "Vy",
				strokeColor : "blue",
				yMaxScale : 20,
			},
			{
				idMHD : vxId,
				title : "Vx",
				strokeColor : "aqua",
				yMaxScale : 100,
			} 
		])
	},

	url: function(){ 
		return "mhd1dSims"; },		
});


// Define some constants to make it easier to find specific models.
// We need to map the fields that come back from MHD.js to the 
// corresponding models here.
// We could use the title, but translation would cause problems.
// Using consts makes it clear.
const vxId = 1;
const vyId = 2;
const vzId = 3;
const bxId = 4; // Bx is constant in 1-D but not in 2-D
const byId = 5;
const bzId = 6;
const densId = 7;
const pressureId = 8;

// make it possible for views to talk to each other
var eventer = _.extend({}, Backbone.Events);

// The checkbox views.
// This watches for changes to the checkbox, and set the doPlot variable of
// the model to match.
CheckboxIndividualView = Backbone.View.extend({
	labelString : {},
	model : {},
	trackingRange : {},
	scaleFactor : {},
	initialize : function (options) {
		this.labelString = options.model.get('title');
		this.trackingRange = false;
		this.scaleFactor = 5;
		if (typeof options.model != 'undefined') {

			this.model = options.model;
			this.listenTo(options.model, 'change:doPlot', function () {
				//logMessage('View caught a model change.');
			});
		}
		this.render();
		this.readRange(); // call after the render so the template has been instantiated.
	},
	render : function () {

		var variables = {
			checkbox_label : this.labelString,
			font_color : this.model.get('strokeColor'),
		};
		// Compile the template using underscore
		var template = _.template($("#checkbox_template").html(), variables);
		this.$el.html(template);
		return this;
	},
	events : {
		"click input[type=checkbox]" : "toggleCheck",
		"mousedown input[type=range]" : "startTracking",
		"mousemove input[type=range]" : "doTrack",
		"mouseup input[type=range]" : "stopTracking",
	},
	toggleCheck : function (event) {
		this.model.set('doPlot', event.currentTarget.checked);
	},
	startTracking : function (event) {
		this.trackingRange = true;
	},
	stopTracking : function (event) {
		this.trackingRange = false;
		this.readRange(event);
	},
	doTrack : function (event) {
		if (this.trackingRange) {
			this.readRange(event);
		}
	},
			
	readRange : function (event) {
		var val;
		var eventMax;
		var objectMax = this.model.get('yMaxScale');
		var valScaleFactor; // if we change the max, we also need to adjust the val. (Chrome does it for us, but firefox doesn't)
		var stepScaleFactor; // if we change the max, we also need to adjust the step.
		var sliderMax;
		var currMax;
		var debugBreak = 0;
		if (event){
			val = event.currentTarget.value;
			eventMax = event.currentTarget.max;
		}
		if (!val){
			var nodes = this.el.childNodes;
			for (var i = 0, len = nodes.length; i < len; i++){
				var node = nodes[i];
				var type = node.type;
				var nodeType = node.nodeType;
				var min = node.min;
				eventMax = node.max;
				if (nodeType === 1 && type === 'range'){
					maxScaleFactor = 1; // do nothing is safe.
					objectMax = this.model.get('yMaxScale');
					if (node.max !== objectMax) {
						sliderMax = node.max != 0? node.max:1;
						valScaleFactor = node.value/node.max; // how much of the max is the current value?
						stepScaleFactor = node.step/node.max
						node.max = objectMax;
						var testChildren = this.el.childNodes;
						var testNode = testChildren[i];
						var testMax = testNode.max;
						debugBreak = 1;		
					}
					// chrome updates the value, firefox doesn't
					node.value = valScaleFactor*objectMax;
					node.step = stepScaleFactor*objectMax;
					val = node.value;
				}
			}
		}
		if (objectMax && event && 
				(currMax=parseInt(event.currentTarget.max,10)) !== objectMax){
			maxScaleFactor = objectMax/currMax;
			valScaleFactor = event.currentTarget.value/currMax // how much of the max is the current value?
			stepScaleFactor = event.currentTarget.step/currMax;
			event.currentTarget.max = objectMax;
			if (val){ // do this after setting max, in case setting max scales others.
				event.currentTarget.value = valScaleFactor*objectMax;
				val = event.currentTarget.value;
				event.currentTarget.step = stepScaleFactor*objectMax;
			}
		}
		else {
			debugBreak = 100;
		}
		if (val){
			
			var currentYScale = this.model.get('yScale');
			if (val != currentYScale) {
				this.model.set('yScale', val);
				logMessage("changed rangeval = " + val);
			}
			debugBreak = 10;
		}
		else {
			debugBreak = 50;
		}
	},
});


CheckboxOverallView = Backbone.View.extend({
	initialize: function(options){
		this.collection = options.collection;
		_.bindAll(this, 'add')
		this.collection.on ("reset", "reset_collection")
	},

	add: function(myModel){
		childView = new CheckboxIndividualView({model: (myModel)});
		this.childViews.push(childView);
		this.$el.append(childView.render().$el);
	},
	reset_collection: function(){
		_(this.childViews).each( function(cv){ cv.off(); cv.remove();});
		this.childViews = [];
		_(this.collection.models).each(this.add);
	},
  render: function() {
		// reset_collection will build and append the views for 
		// the collection in the case where the collection was populated 
		// before this render() method was called (going forward, the "reset" event
		// will appropriately trigger the reset_collection method)
		this.reset_collection();
		// insert the view into the DOM
		$("#checkbox_items").append(this.$el);
	},
});

// BACKBONE ROUTER
MHDRouter = Backbone.Router.extend({
	initialize: function(){
	},
	routes: { "": "mhd1dSims"},
	mhd1dSims: function(){	
		window.plotCollection = new ElementsToPlotCollection();
		window.plotCollection.fetch();
		window.simParamView = new SimParametersOverallView({el : $('#sim_param_controller')}); // must come before SimControllerView
		window.simControlView = new SimControllerView({ el: $('#sim_controller'), collection: window.plotCollection, eventer: eventer});
		window.linePlot = new LinePlotView({
			collection : window.plotCollection
		});
		window._view = new CheckboxOverallView({collection: window.plotCollection});
		window._view.render();
	},
});

SimControllerView = Backbone.View.extend({
		 numPoints : {},
		 mhd : {},
		 Bx : {},
		 By : {},
		 Bz : {},
		 dens : {},
		 pressure : {},
		 vx : {},
		 vy : {},
		 vz : {},
		 gamma  : {},
		 dx : {},
		 percentDb  : {},
		 numGridPoints : {},
		 nIntervId : {},
		 isRunning : {},
		 plotDelay : {},

 		initialize : function (options) {
			this.mycollection = options.collection;
			_.bindAll(this, "render", "toggleRunning", "startSimulation", "stopSimulation",
			"takeTimeStep", "updateParams");
			options.eventer.bind("simParamsChanged", this.updateParams);
			this.isRunning = false;
			this.setup();
		},
		
		setup : function() {
			this.numPoints = parseInt(document.getElementById('numPointsSlider').value,10);
			this.timeStepsPerDisplay = parseInt(document.getElementById('numTimeStepsPerSlider').value,10);
			this.percentDb = parseInt(document.getElementById('perturbStrengthSlider').value,10);
			this.numGridPoints = parseInt(document.getElementById('perturbWidthSlider').value,10)*this.numPoints/100;
			this.plotDelay = parseInt(document.getElementById('plotDelaySlider').value,10);
						
			//this.numPoints = 200;
			this.mhd = new MHD(this.numPoints);

 			this.Bx = 1000.0;
 			this.By = 0;
 			this.Bz = 0;
 			this.dens = 1;
 			this.pressure = 1;
 			this.vx = 0;
 			this.vy = 0;
 			this.vz = 0;
 			this.gamma = 1.67;
 			this.dx = 0.05;
 			//this.percentDb = 50;
 			//this.numGridPoints = 10;
 			// Initialize with constant values.
 			this.mhd.init(this.Bx, this.By, this.Bz, this.dens, this.pressure, this.vx, 
				this.vy, this.vz, this.gamma, this.dx);
			// Now add a Gaussian perturbation in By
			this.mhd.addByPerturbation(this.percentDb, this.numGridPoints)
			var perturbedResults = this.mhd.getResults();
 			this.plotLines(perturbedResults);
 			if (this.isRunning ){
				this.toggleRunning();
			}
 			this.render();
 		},
 
		render : function () {
			var startStopString;
			if (this.isRunning){
				startStopString = "stop";
			}
			else{
				startStopString = "start";
			}
			var variables = {
				start_stop_string : startStopString
			};
			// Compile the template using underscore
			var template = _.template($("#start_stop_template").html(), variables);
			this.$("#start_stop_position").html(template);
			return this;
		},

		// w[0][] = dens, w[1][] = pressure, w[2][] = vx, w[3][] = vy,
		//w[4][] = vz, w[5][] = By, w[6][] = Bz
		events : {
			"click #start_stop": "toggleRunning",
			"click #reset": "setup",
		},

		toggleRunning : function() {
			if (this.isRunning){
				this.stopSimulation();
			}
			else{
				this.startSimulation();
			}
			this.isRunning = !this.isRunning;
			this.render();
		},
		
		updateParams : function(params) {
			if (params.type === 'numTimeStepsPerSlider') {
				this.timeStepsPerDisplay = params.value;
				if (this.isRunning) {
					this.stopSimulation();
					this.startSimulation();
				}				
			} else if (params.type === 'plotDelaySlider') {
				this.plotDelay = params.value;
				if (this.isRunning) {
					this.stopSimulation();
					this.startSimulation();
				}				
			} else {
				logMessage(" unknown updateParams event");
			}			
		},

		startSimulation : function () {
			this.nIntervId = setInterval(this.takeTimeStep, this.plotDelay); // take a time step every 100 milliseconds
		},
		stopSimulation : function () {
			clearInterval(this.nIntervId);
		},

		takeTimeStep : function () {
			this.mhd.takeTimeSteps(this.timeStepsPerDisplay); // now we should get some changes
			this.plot();
		},
		
		plot : function () {
			var results = this.mhd.getResults();
			this.plotLines(results);
		},

		// This will update the models with the new points, triggering a redraw.
		plotLines : function (results) {
			var x = [];
			var y = [];

			var i;
			var numItems = results[0].length;
			if (numItems < 1) {
				return;
			}

			var dx = this.mhd.dx;
			for (i = 0; i < numItems; ++i) {
				x[i] = i * dx;
			}

			// w[0][] = dens, w[1][] = pressure, w[2][] = vx, w[3][] = vy,
			// w[4][] = vz, w[5][] = By, w[6][] = Bz
			// Density
			y = results[0].slice(0);
			this.setModelPoints(x, y, densId);

			// pressure
			y = results[1].slice(0);
			this.setModelPoints(x, y, pressureId);

			// vx
			y = results[2].slice(0);
			this.setModelPoints(x, y, vxId);

			// vy
			y = results[3].slice(0);
			this.setModelPoints(x, y, vyId);

			// vz
			y = results[4].slice(0);
			this.setModelPoints(x, y, vzId);

			// By
			y = results[5].slice(0);
			this.setModelPoints(x, y, byId);

			// Bz
			y = results[6].slice(0);
			this.setModelPoints(x, y, bzId);
		},

		setModelPoints : function (xArray, yArray, id) {
			var numItems = xArray.length;
			var myPoints = [];
			for (var i = 0; i < numItems; ++i) {
				myPoints[i] = [xArray[i], yArray[i]];
			}
			var model = this.mycollection.findWhere({idMHD: id});
			model.set('points', myPoints);
		},
	});


SimParametersIndividualView = Backbone.View.extend({
	legend : {},
	type : {}, // What type event do we send?
	min : {},
	max : {},
	step : {},
	value : {},
	sendUpdate : {}, // Do we send an event on every change?
	isTrackingRange : {},
	eventer : {},
	initialize : function (options) {
		_.bindAll(this, "render", "startTracking", "stopTracking", "doTrack",
		"readRange");
		this.legend = options.legend;
		this.type = options.type;
		this.min = options.min;
		this.max = options.max;
		this.step = options.step;
		this.value = options.value;
		this.sendUpdate = options.sendUpdate;
		this.isTrackingRange = false;
		this.eventer = options.eventer;
		if (typeof options.model != 'undefined') {

			this.model = options.model;
			this.listenTo(options.model, 'change:doPlot', function () {
				//logMessage('View caught a model change.');
			});
		}
		this.render();
		//this.readRange(); // call after the render so the template has been instantiated.
	},
	render : function () {

		var variables = {
			sim_parameters_legend : this.legend,
			current_slider_value : this.value,
		};
		// Compile the template using underscore
		var template = _.template($("#sim_parameters_template").html(), variables);
		this.$el.html(template);
		// Now change the id so the rest of our code can find it.
		// The template will continually change the id, so we need to reset
		// after each render.
		var foundElement = document.getElementById(this.type);
		if(foundElement === null){
			var nodes = this.el.childNodes;
			var nodesLen = nodes.length;
			for (var i = 0, len = nodesLen; i < len; i++){
				var node = nodes[i];
				var type = node.type;
				var nodeType = node.nodeType;
				if (nodeType === 1 && type === "range"){
					node.id = this.type;		
					node.min = this.min.toString();
					node.max = this.max.toString();
					node.step = this.step.toString();
					node.value = this.value.toString();	
					i = nodesLen; // found one, we're done
				}
			}
		}
		return this;
	},
	events : {
		"mousedown input[type=range]" : "startTracking",
		"mousemove input[type=range]" : "doTrack",
		"mouseup input[type=range]" : "stopTracking",
		// "click input[type=range]" : "readRange",
	},
	
	startTracking : function (event) {
		this.isTrackingRange = true;
	},
	stopTracking : function (event) {
		this.isTrackingRange = false;
		this.readRange(event);
	},
	doTrack : function (event) {
		if (this.isTrackingRange) {
			logMessage("doTrack");
			this.readRange(event);
		}
	},
			
	readRange : function (event) {
		var val;
		var debugBreak = 0;
		if (typeof event !== 'undefined'){
			val = parseInt(event.currentTarget.value,10);
		}
		if (typeof val === "undefined"){
			var nodes = this.el.childNodes;
			var nodesLen = nodes.length;
			for (var i = 0, len = nodesLen; i < len; i++){
				var node = nodes[i];
				var type = node.type;
				var nodeType = node.nodeType;
				if (nodeType === 1 && type === 'range'){
					val = node.value;
					i = nodesLen; // found one, we're done
				}
			}
		}
		if (typeof val !== "undefined"){
				// update local value
			if (val != this.value) {
				this.value = val;
				
				// Update the text box with the current value.
				this.updateValueDisplay(this.type, "sliderValue", this.value);
				if (this.sendUpdate) {
					// send the event
					params = {
						type : this.type,
						value : this.value
					}
					this.eventer.trigger("simParamsChanged", params);
				}
			}
		}
	},	
	
	updateValueDisplay : function(id, classToUpdate, valueToUse){
		var foundElement = document.getElementById(id);
		if(foundElement !== null){
			var nodes = this.el.childNodes;
			var nodesLen = nodes.length;
			for (var i = 0, len = nodesLen; i < len; i++){
				var node = nodes[i];
				var myClass = node.className;
				if (myClass === classToUpdate){
					node.innerText = valueToUse;
					i = nodesLen; // found one, we're done
				}
			}
		}
	},
});

SimParametersOverallView = Backbone.View.extend({
	childViews : [],
	children : [],
	initialize: function(options){
		_.bindAll(this, "render", "add", "reset_collection");
		this.children[0] = {
			legend : "Number of time steps per display",
			type : "numTimeStepsPerSlider", // This will trun into the id for the div.
			min : 1,
			max : 100,
			step : 5,
			value : 30,
			sendUpdate : true,
			eventer : eventer
		};
		this.children[1] = {
			legend : "Delay between time steps:",
			type : "plotDelaySlider",
			min : 1,
			max : 200,
			step : 10,
			value : 100,
			sendUpdate : true,
			eventer : eventer
		};
		this.children[2] = {
			legend : "Number of points, must reset:",
			type : "numPointsSlider",
			min : 20,
			max : 1000,
			step : 20,
			value : 200,
			sendUpdate : false,
			eventer : eventer
		};
		this.children[3] = {
			legend : "Strength of perturbation (percent of background field), must reset:",
			type : "perturbStrengthSlider",
			min : 0,
			max : 10,
			step : 1,
			value : 5,
			sendUpdate : false,
			eventer : eventer
		};
		this.children[4] = {
			legend : "Width of perturbation (percent of number of total grid points), must reset:",
			type : "perturbWidthSlider",
			min : 0,
			max : 10,
			step : 1,
			value : 5,
			sendUpdate : false,
			eventer : eventer
		};
			
		this.render();
	},


	add: function(cv){
		var childView = new SimParametersIndividualView(cv);
		this.childViews.push(childView);
		this.$el.append(childView.render().$el);
	},
	reset_collection: function(){
		_(this.childViews).each( function(cv){ cv.off(); cv.remove();});
		this.childViews = [];
		_(this.children).each(this.add);
	},
	render: function() {
		// reset_collection will build and append the views for 
		// the collection in the case where the collection was populated 
		// before this render() method was called (going forward, the "reset" event
		// will appropriately trigger the reset_collection method)
		this.reset_collection();
		// insert the view into the DOM
		$("#sim_param_controller").append(this.$el);
	},
});


// The canvas line views
LinePlotView = Backbone.View.extend({
		mycollection : {},
		initialize : function (options) {
			this.mycollection = options.collection;
			_.bindAll(this, "render", "resizeContext", "remove");
			this.mycollection.bind('change:doPlot', this.render);
			this.mycollection.bind('change:points', this.render);
			this.mycollection.bind('change:xScale', this.render);
			this.mycollection.bind('change:yScale', this.render);
			this.render();
			$(window).on("resize",this.resizeContext); // make sure we get called when the window is resized.
			this.resizeContext();
		},

		remove : function() {
			$(window).off("resize",this.resizeContext);
			//call the superclass remove method
			Backbone.View.prototype.remove.apply(this, arguments);
		},
		
		resizeContext : function() {
			var controllersItem = document.getElementById("input_items");
			var controlwidth = controllersItem.offsetWidth;
			var canvas = document.getElementById("plot_canvas");
			var canwid = canvas.width;
			var winwid = $(window).width();
			//logMessage("received resize event, controllersView.width = " + controlwidth + 
			//" canvas width = " + canwid + " window width = " + winwid);
			canvas.width = winwid - controlwidth - 50;

			var contentItem = document.getElementById("content");
			var contentheight = contentItem.offsetHeight;
			var canheight = canvas.height;
			var winheight = $(window).height();
			//logMessage("received resize event, contenthieght = " + contenthieght + 
			//" canheight = " + canheight + "winhieght = " + winhieght);
			canvas.height = winheight - contentheight - 50;
			
			this.render(); // update the plot with the current size.
		},	
		
		
		render : function () {
			var canvas = document.getElementById("plot_canvas");
			var ctx = canvas.getContext("2d");

			ctx.save();
			// hmm... the canvas remembers the lines that were drawn
			// as soon as we draw any line, all previously drawn lines draw. ???
			ctx.clearRect(0, 0, canvas.width, canvas.height);
			//ctx.beginPath(); // This starts over, clearing the previous lines

			for (var i = 0; i < this.mycollection.length; ++i) {
				var model = this.mycollection.models[i];
				if (model.get('doPlot')) {
					ctx.beginPath(); 
					var points = model.get('points');
					var scaledPoints = this.scalePoints(points, model.get('xScale'), model.get('yScale'));
					var point = scaledPoints[0];
					ctx.moveTo(point[0], point[1]);
					for (var j = 1; j < scaledPoints.length; ++j) {
						point = scaledPoints[j];
						ctx.lineTo(point[0], point[1]);
						//ctx.fillRect(point[0], point[1],3,3); // draw small square at point
					}
					ctx.strokeStyle  = model.get('strokeColor');
					ctx.stroke();
				}
			}
			ctx.restore();
		},

			// the model.xScale, model.yScale is a window independent scale factor, 
			// i.e we want to be 10 times greater than actual. 
			// For the actual drawing we will have to multiply this by a conversion that will fit the item in the canvas
			// The scaling works so that a value of 2 will fill the canvas.
			// Usually the x-axis is in the middle of the canvas, so a y value of 1 will
			// be at the top of the canvas.
			// yScale should be set to get a maximum value near 1 to get a full size plot.

		scalePoints : function (array, xScale, yScale) {
			var retVal = [];
			var canvas = document.getElementById("plot_canvas");
			var canvasHeight = canvas.height == 0 ? 500: canvas.height;
			var canvasWidth = canvas.width == 0 ? 500: canvas.width;
			var i;
			var numPoints = array.length;
			var xLen = array[numPoints-1][0] === 0 ? 1 : array[numPoints-1][0];
			// We assume that all arrays have the same x-values.
			xFactor = canvasWidth/xLen;
			var mid = canvasHeight/2;
			yScaleFactor = (typeof yScale === "undefined") ? -canvasHeight/5 : -yScale;
			yScaleFactor *= canvasHeight/500; // designed to be in 500 X 500 canvas. scale if different.
			var x = 0;
			var y = 0;
			for (var i = 0; i < array.length; ++i) {
				x = xFactor*array[i][0];
				y = mid + yScaleFactor * array[i][1];
				retVal[i] = [x, y];
			}
			return retVal;
		},			
	});

