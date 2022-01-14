
"use strict"

var textModel = Backbone.Model.extend({
	defaults : {
		title : '',
		text : '',
		isActive : false,
	},
});

var TextsToViewCollection = Backbone.Collection.extend({
	model : textModel,

	initialize: function(options){
		_.bindAll(this, "fetch", "findActiveModel");
	},
	//overriding the fetch method. normally fetch() grabs a resultset from a REST server
	fetch : function() {
		this.reset([
			{
				titleId : 'home', // used to find the model
				title : 'home', // may be used for window title
				text : ' <h1>Welcome to NephiNumerics</h1> <p>Nestled under majestic Mount Nebo in Utah\'s Wasatch Range, the small town of Nephi is considered by many to be the Promised Land<a href="http://en.wikipedia.org/wiki/Mount_Nebo" ><sup>*</sup></a>. </p><p>It is an ideal place for quiet contemplation and when that gets to be too hard, it is also a great place for creation of computer codes. We have a little fun with some physics simulations. And have recently added a page to create some NCAA Brackets for you. It\'s pretty bare-bones, but it gets the job done. Click the slider to recalculate. Move the slider to change the odds.</p><p>As you may have guessed, this site is still under construction. So come on in, look around and come back later when great things have been created.</p>',
				url : 'home',
				isActive : false,
			},
			{
				titleId : 'about',
				title : 'about',
				text : ` <div class="ButtonOnBottom">
					<div>
						<h1>About Us</h1>  <p>If you want to ponder the deeper meanings of the universe, check out our pages on physics simulations. And if you want some help filling out your NCAA Brackets, click on the brackets link. It\'s pretty bare-bones, but it gets the job done. Click the slider to recalculate. Move the slider to change the odds.</p> <p>Unfortunately, none of the pictures on these pages are of Mount Nebo. However <a href="http://www.willhiteweb.com/utah_climbing/wasatch_mountains/nebo_loop/mount_nebo_090.htm">these are</a> and <a href="http://www.flickr.com/photos/courthouselover/7595185120/">this</a> is of Nephi</p>
					</div>
					<div class="toBottom">
						<br/><br/><br/><br/>
					</div>
				</div>`,
				url : 'about'
			},
			{
				titleId : 'portfolio',
				title : 'portfolio',
				text : ' <h1>Our Work</h1>  <p>We have some home grown physics simulations right <a href="simulations.html">here.</a></p> <p>This web site is a simple site for testing new web technologies. The main site is a single page backbone.js app. The separate "pages" are simply different models and their views are displayed when the user clicks the appropriate menu. The code currently all lives in javascript, but it can easily be put in a database. </p><p>The physics section of the site contains three separate javascript simulations. Two are rather straightforward javascript simulations of particles in constant magentic and electric fields. The MHD page is a more interesting 1-dimensional mhd simulation of anideal plasma. The simulation is written entirely in Javascript. It currently uses interval based timing to allow the web page to remain interactive. It will eventually be re-written as a web worker and the performance compared with the interval based method. The MHD page is also a single page backbone app with all of the interaction managed by backbone views.</p><p></p>',
				url : 'portfolio'
			},
			{
				titleId : 'blog',
				title : 'blog',
				text : ' <div class="blog"><h2>Nov</h2><h3>22nd</h3></div> <h4 class="select"><a href="#blog">Magazine Photo-Shoot on the Isle-Of-Islay</a></h4><p>Wouldn\'t that be nice. <a href="#blog">read more.....</a></p><div class="blog"><h2>Oct</h2><h3>25th</h3></div><h4><a href="#blog">Wedding Shoot in Edinburgh</a></h4><p>Ediburgh sounds interesting. <a href="#blog">read more.....</a></p>',
				url : 'blog'
			},
			{
				titleId : 'contact',
				title : 'contact',
				text : `<div class="ButtonOnBottom">
					<div><h1>Contact</h1>
						<a href="mailto:info@nephinumerics.com">info@nephinumerics.com</a>
					</div>
					<div class="toBottom">
					</div>
				</div>`,
				url : 'contact'
			}
		])
	},

	findActiveModel : function(){
		var currentModel;
		var found = false;
		var looper = 0;
		var numModels = this.length;
		do {
			currentModel = this.models[looper];
			found = currentModel.get('isActive');
			++looper;
		} while (!found && looper < numModels);
		if (!found) {
			currentModel == {};
		}
		return currentModel;
	},

});

var TextView = Backbone.View.extend({
	initialize : function () {
		_.bindAll(this, "render");
		this.model.bind('change:isActive', this.render);
	},
	render : function () {

		var variables = {text_placeholder : this.model.get('text'),};
		if (!this.model.get('isActive')) {
			variables = {text_placeholder : ''};
		}
		// Compile the template using underscore
		var template = _.template($("#content_text_template").html());
		var result = template(variables);
		this.$el.html(result);

		return this;
	},
});

// BACKBONE ROUTER
var MainRouter = Backbone.Router.extend({
	initialize: function(){
		_.bindAll(this, "loadMenu");
	},
	routes: {
		"": "home",
		'home': 'home',
		"about" : "about",
		"portfolio" : "portfolio",
		"blog": "blog",
		"contact": "contact",
		"*path" : "default"
	},
	default : function() {
		console.log("default");
	},
	home: function(){
		this.loadMenu('home');
	},
	about: function(){
		this.loadMenu('about');
	},
	portfolio: function(){
		this.loadMenu('portfolio');
	},
	blog: function(){
		this.loadMenu('blog');
	},
	contact: function(){
		this.loadMenu('contact');
	},
	loadMenu: function(menuName){
		if (!this.myTextCollection){
			this.myTextCollection = new TextsToViewCollection();
			this.myTextCollection.fetch();
		}

		var activeModel = this.myTextCollection.findActiveModel();
		var homeModelArray = this.myTextCollection.where({titleId : menuName});
		var homeModel = homeModelArray[0];

		if (activeModel !== homeModel) {
			activeModel.set({isActive: false});
			homeModel.set({isActive: true});
		}
		this.myTextView = new TextView({model: homeModel, el : '#content_text'});
		this.myTextView.render();
	},
});
