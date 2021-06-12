// Desktop mouseup, down and mousemove
canvas.addEventListener('mousedown', e => tagMouseDown(e));
canvas.addEventListener('mouseup', e => tagMouseUp(e));
canvas.addEventListener('mousemove', e => tagMouseMove(e));

// initialise parameters to use for drawing
function TagBox() {
	this.x = 0;
	this.y = 0;
	this.w = 1;
	this.h = 1;
	this.tag = "";
}

// Methods on the Box class
TagBox.prototype = {
	draw: function(context, fill="#444444", isFilled=false) {
		context.strokeStyle = fill;
    context.strokeRect(this.x,this.y,this.w,this.h);
    context.font = "8pt Arial";
    context.fillStyle = fill;
    context.fillText(this.tag, (this.x + this.w) + 5, (this.y + this.h) + 20);
	},
  redraw: function (x, y) {
      this.x = x || this.x;
      this.y = y || this.y;
      this.draw(context);
      return (this);
  },
  isPointInside: function(x, y) {    
    return (x <= this.x && x >= this.x + this.w && y <= this.y && y >= this.y + this.h);
  },
  highlight: function (x, y) {
      this.x = x || this.x;
      this.y = y || this.y;
      context.cursor = "col-resize";
      this.draw(context, "rgb(67, 155, 249)");
      return (this);
  }
}

//Initialize a new Box and add it
function addTag(x, y, w, h, tag, isNew=true) {
  // will not store if tag is undefined
  if(w === undefined || h === undefined)
    return

	var rect = new TagBox;
	rect.x = x;
	rect.y = y;
	rect.w = w
	rect.h = h;
	rect.tag = tag;
	boxes.push(rect);	
  
  if(isNew) {
    store.push({"x": x,"y": y,"w": w, "h": h, "tag":tag});
    renderTagsToTHtml(tag, currentKey, store.length - 1);
    db.collection('photos').doc(currentKey).update({ tags: store });
  }
}

function updateTag(x, y, w, h, tag) {
  // will not store if tag is undefined
  if(w === undefined || h === undefined)
    return

	var rect = new TagBox;
	rect.x = x;
	rect.y = y;
	rect.w = w;
	rect.h = h;
	rect.tag = tag;

	boxes[activeDragIndex] = rect;	
  store[activeDragIndex] = {"x": x,"y": y,"w": w, "h": h, "tag":tag};
  db.collection('photos').doc(currentKey).update({ tags: store });

  activeDragIndex = null;
}

function getMousePosition(e){
	var element = canvas;
	offsetX = 0;
	offsetY = 0;

  // when it goes beyond the canvas
  if (element.offsetParent){
		do{
			offsetX += element.offsetLeft;
			offsetY += element.offsetTop;
		}
		while ((element = element.offsetParent));
	}

	mx = e.pageX - offsetX;
	my = e.pageY - offsetY
}

function getDragPosition(x, y, w, h, tag) {
  xDrag = x;
  yDrag = y;
  wDrag = w;
  hDrag = h;
  tagDrag = tag;
}

tagMouseDown = function(e) {
	getMousePosition(e);
  activeDragIndex = null;

  if(boxes.length > 0) {
    for (var i = 0; i < boxes.length; i++) {
      if (boxes[i].isPointInside(mx, my)) {
        isDrawTagging = false;
        isDragging = true;
        activeDragIndex = i;
        rectX = mx;
	      rectY = my;
        return
      }
    }
  }

  isDrawTagging = true;

  rectX = mx;
	rectY = my;
};

tagMouseMove = function(e){
  getMousePosition(e);

  if(!isDragging) {
    // Highlight tag shape and list
    if(boxes.length > 0) {
      context.clearRect(0, 0, imageCanvasWidth, imageCanvasHeight);
      context.drawImage(canvasImage, 0, 0, imageCanvasWidth, imageCanvasHeight);
      activeTagIndex = null;
      renderTagsInHtml(); // @TODO: revisit code, problem: will rerender once mouse is hovering the canvas

      for (var i = 0; i < boxes.length; i++) {
        if (boxes[i].isPointInside(mx, my)) {
          activeTagIndex = i;
          boxes[i].highlight();
          renderTagsInHtml();
        } else {
          boxes[i].redraw();
        }
      }
    }
  }

	if (isDrawTagging){
    let x = Math.min(mx, rectX),
      y = Math.min(my, rectY),
      w = Math.abs(mx - rectX),
      h = Math.abs(my - rectY);

    tagDraw(x, y, w, h);  // This function draws the box at intermediate steps
  }

  if(isDragging) {
    let xDrag =boxes[activeDragIndex].x,
        yDrag =boxes[activeDragIndex].y,
        wDrag = boxes[activeDragIndex].w,
        hDrag = boxes[activeDragIndex].h;

    // calculate the distance the mouse has moved
    // since the last mousemove
    let dx = mx-rectX;
    let dy = my-rectY;

    // move each rect that isDragging 
    // by the distance the mouse has moved
    // since the last mousemove
    xDrag += dx;
    yDrag += dy;
    
    getDragPosition(xDrag, yDrag, wDrag, hDrag, boxes[activeDragIndex].tag);
    dragDraw(xDrag, yDrag, wDrag, hDrag, boxes[activeDragIndex].tag); 
  }
}

tagMouseUp = function(e){
  if(isDrawTagging) {
    var tag = prompt("Please enter tag name");

    if (tag != null && tag != "") { 
      var rectH = my - rectY;
	    var rectW = mx - rectX;
    }

    if ( rectH > 0) {
				rectY = my;
				rectH = -rectH;
			}
			if (rectW > 0) {
				rectX = mx;
				rectW = -rectW;
			}

      if (rectW == 0 || rectH == 0) {
				alert("Error creating tag! Please specify non-zero height and width");
      } else {
				addTag (rectX, rectY, rectW, rectH, tag);
			}

      context.clearRect(0, 0, imageCanvasWidth, imageCanvasHeight);
      context.drawImage(canvasImage, 0, 0, imageCanvasWidth, imageCanvasHeight);
      drawBoxes(boxes);

      isDrawTagging = false;
  }

  if(isDragging) {
    var isDragConfirm = confirm("Are you sure you want to move the tag to this locaiton?");
    if(isDragConfirm) {
      updateTag (xDrag, yDrag, wDrag, hDrag, tagDrag);
    }

    context.clearRect(0, 0, imageCanvasWidth, imageCanvasHeight);
    context.drawImage(canvasImage, 0, 0, imageCanvasWidth, imageCanvasHeight);
    drawBoxes(boxes);

    isDragging = false;
  }
 }


function tagDraw(x, y, w, h) {

	context.clearRect(0, 0, canvas.width, canvas.height);
	context.drawImage(canvasImage, 0, 0, imageCanvasWidth, imageCanvasHeight);
  drawBoxes(boxes);

	if (!w || !h){
		return;
	}

  context.fillStyle = "rgb(67, 155, 249, 0.3)";
  context.fillRect(x, y, w, h);
  context.lineWidth = 1;
  context.strokeStyle = "rgb(67, 155, 249)";
  context.strokeRect(x, y, w, h);
}


function dragDraw(x, y, w, h, tag) {

	context.clearRect(0, 0, canvas.width, canvas.height);
	context.drawImage(canvasImage, 0, 0, imageCanvasWidth, imageCanvasHeight);
  drawBoxes(boxes);

	if (!w || !h){
		return;
	}

  context.fillStyle = "rgb(238, 245, 42, 0.3)";
  context.fillRect(x, y, w, h);
  context.lineWidth = 1;
  context.strokeStyle = "rgb(238, 245, 42)";
  context.strokeRect(x, y, w, h);
  context.font = "8pt Arial";
  context.fillStyle = "black";
  context.fillText(tag, (x + w) + 5, (y + h) + 20);
}

function drawBoxes(tags) {
  if(tags.length > 0) {
    tags.forEach(function(tag) {
      tag.draw(context);
    })
  }
}

// Set photo in canvas
function currentPhotoInCanvas (photo, key) {
  canvas.width = 650;
  canvas.height = 400;
  
  // reset 
  boxes = [];
  store = [];
  elementTags.innerHTML = "";

  canvasImage.onload = function() {
    let nw = canvasImage.naturalWidth;
    let nh = canvasImage.naturalHeight;
    let aspect = nw / nh;
    imageCanvasHeight = canvas.width / aspect;
    imageCanvasWidth = canvas.width;

    // set height when image is set to canvas
    canvas.height = imageCanvasHeight;
     
    db.collection('photos').doc(key).get().then(photo => {
      if(photo.tags !== null) {
        photo.tags.forEach(function(tag, index) {
          addTag(tag.x, tag.y, tag.w, tag.h, tag.tag, false);
          store.push(tag);
          renderTagsToTHtml(tag.tag, key, index, null);
        });

        drawBoxes(boxes);
      }
    })

    context.drawImage(canvasImage, 0, 0, imageCanvasWidth, imageCanvasHeight);
  }


  currentKey = key;
  canvasImage.src= photo;
  canvas.setAttribute("key", key);
}

function renderTagsInHtml() {
  elementTags.innerHTML = "";

  store.forEach(function(tag, index) {
    renderTagsToTHtml(tag.tag, currentKey, index, activeTagIndex);
  });

  if(activeTagIndex !== null) {
    elementTags.innerHTML += "<div class='infoTag'><b>Tips:</b> Select and hold the mouse key inside the tag shape and drag it to new location.</div>"
  }
}

function removeTag(index) {
  // remove
  store.splice(index,1);
  boxes.splice(index,1);

  // re-render tags
  db.collection('photos').doc(currentKey).update({ tags: store }).then(function(response) {
    renderTagsInHtml();
  });

  // draw boxes and image again
  context.drawImage(canvasImage, 0, 0, imageCanvasWidth, imageCanvasHeight);
  drawBoxes(boxes);
}




