var scene, camera, textureCube, renderer, controls, currentDesign = "Design 1",
    rodsThree = [], polesThree = [], picoC;

$(function() {
    initDom();
    initCode();
    initThree();
    animate();
});

function setCurrentDesign(name) {
    currentDesign = name;
    localStorage["currentDesign"] = name;
    fillDesigns();
    $("#rename-design").val(currentDesign);
}
function getPoles() {
    return JSON.parse(localStorage["allPoles"])[currentDesign];
}
function setPole(i, pole) {
    var poles = getPoles();
    poles[i] = pole;
    setPoles(poles);
}
function setPoles(poles) {
    var allPoles = JSON.parse(localStorage["allPoles"]);
    allPoles[currentDesign] = poles;
    localStorage["allPoles"] = JSON.stringify(allPoles);
    $(window).trigger('polesChanged');
}
function updateRod(i, j, key, value) {
    var pole = getPoles()[i];
    var rod = pole.rods[j];
    rod[key] = value;
    pole.rods[j] = rod;
    setPole(i, pole);
}
function len(o) {
    var count = 0;
    for (var prop in o) {
        if (o.hasOwnProperty(prop)) {
            ++count;
        }
    }
    return count;
}
function setRodBrightness(i, brightness) {
    if (i < rodsThree.length) {
	var rod = rodsThree[i];
	rod.material = makeMaterial(rod.color, brightness);
    }
}
function makeMaterial(color, brightness) {
    return new THREE.MeshLambertMaterial({color: 0xffffff,
                                          transparent: true,
                                          opacity: 0.35,
                                          combine: THREE.MixOperation,
                                          reflectivity: 0.25,
                                          envMap: textureCube,
                                          refractionRatio: 0.5,
                                          emissive: colorToHex(color, brightness)});
}
function pushPole(pole) {
    var poles = getPoles();
    poles.push(pole);
    setPoles(poles);
    return poles.length - 1;
}
function removePole(i) {
    var poles = getPoles();
    poles.splice(i, 1);
    setPoles(poles);
}
function appendPole(i) {
    var template = $("#pole-template").html();
    var pole = getPoles()[i];
    var html = template.replace(/{i}/g, i.toString());
    html = html.replace(/{x}/g, pole.pos[0]);
    html = html.replace(/{y}/g, pole.pos[1]);
    $("#edit-rods-content").append(html);
    var poleElem = $("#edit-pole" + i);
    var table = $("tbody", poleElem);
    displayRods(table, i);
}
function displayRods(table, i) {
    var pole = getPoles()[i];
    for (var i2 in pole.rods) {
        appendRod(table, i2, pole.rods[i2]);
    }
}
function deleteRod(i, j) {
    var pole = getPoles()[i];
    pole.rods.splice(j, 1);
    setPole(i, pole);
}
function appendRod(table, i, rod) {
    var template = $("#rod-template").html();
    var html = template.replace(/{i}/g, i);
    html = html.replace(/{iHuman}/g, i + 1);
    html = html.replace(/{r}/g, rod.r);
    html = html.replace(/{theta}/g, rod.theta);
    html = html.replace(/{color}/g, rod.color);
    html = html.replace(/{height}/g, rod.height);
    var $elem = $(html);
    $(".color option", $elem).each(function(i, o) {
        if (o.innerText === rod.color) {
            o.selected = true;
        }
    });
    $(table).append($elem);
}
function fillDesigns() {
    $("#select-design").text("");
    var allPoles = JSON.parse(localStorage["allPoles"]);
    $.each(allPoles, function(key) {
        var $elem = $("<option></option>").text(key);
        if (key == currentDesign) {
            $elem.attr('selected', true);
        }
        $("#select-design").append($elem);
    });
    $("#select-design")
        .append($("<option></option>").attr("data-new", true).text("New Design..."));
}
function renameDesign(name) {
    var allPoles = JSON.parse(localStorage["allPoles"]);
    allPoles[name] = $.map(allPoles[currentDesign], function(obj) {
        return $.extend(true, {}, obj);
    });
    if (name != currentDesign) {
        delete allPoles[currentDesign];
    }
    localStorage["allPoles"] = JSON.stringify(allPoles);
    setCurrentDesign(name)
    fillDesigns();
}
function displayPoles() {
    for (var i in getPoles()) {
        appendPole(i);
    }
}
function newDesign() {
    var allPoles = JSON.parse(localStorage["allPoles"]), i = 1;
    while (("Design " + i) in allPoles) {
        i++;
    }
    setCurrentDesign("Design " + i);
    setPoles([{rods: [{r: 0, theta: 0, height: 3, color: 'R'}],
               pos: [-2, -2]}]);
    fillDesigns();
}
function colorToHex(c, b) {
    var b = b !== undefined ? b : 255;
    switch (c) {
        case 'R':
        return (b << 16);
        case 'G':
        return (b << 8);
        case 'B':
        return b;
        case 'Y':
        return (b << 16) | (b << 8);
        case 'O':
        return (b << 16) | ((b/2) << 8);
        case 'W':
        return (b << 16) | (b << 8) | b;
        default:
        return 0x000000;
    }
}

function initDom() {
    if ("renderPoles" in localStorage) {
        var renderPoles = JSON.parse(localStorage["renderPoles"]);
        $("#render-poles-check input").attr("checked", renderPoles);
    } else {
        localStorage["renderPoles"] = true;
    }
    if (!("allPoles" in localStorage)) {
        localStorage["allPoles"] = "{}";
        setPoles([{rods: [{r: 0, theta: 0, height: 3, color: 'R'}], pos: [-2, -2]}]);
    }
    if ("currentDesign" in localStorage) {
        currentDesign = localStorage["currentDesign"];
    } else {
        for (var name in JSON.parse(localStorage["allPoles"])) {
            currentDesign = name;
            break;
        }
        localStorage["currentDesign"] = currentDesign;
    }
    fillDesigns();
    $("#rename-design").val(currentDesign);
    displayPoles();

    $("#select-design").change(function() {
        var $this = $(this);
        if ($this.val() == "New Design...") {
            newDesign();
        } else {
            setCurrentDesign($this.val());
            $(window).trigger("polesChanged");
        }
        $(".edit-pole").remove();
        displayPoles();
    });

    $("#rename-design").on("keyup click", function() {
        renameDesign($(this).val());
    });

    $("#delete-design").click(function() {
        var allPoles = JSON.parse(localStorage["allPoles"]);
        delete allPoles[currentDesign];
        localStorage["allPoles"] = JSON.stringify(allPoles);
        if (len(allPoles) == 0) {
            newDesign();
        } else {
            for (var name in allPoles) {
                setCurrentDesign(name);
                break;
            }
        }
        $(window).trigger("polesChanged");
        $(".edit-pole").remove();
        displayPoles();
        return true;
    });

    $("#editing-rods").on("keyup", ".pole-pos", function() {
        var i = parseInt($(this).data('i'));
        var pole = getPoles()[i];
        var dir = $(this).hasClass("pole-x") ? 0 : 1;
        pole.pos[dir] = parseFloat($(this).val());
        setPole(i, pole);
    });

    $("#add-pole").click(function() {
        var poles = getPoles();
        var pole = {rods: [], pos: [-2, -2]};
        var i = pushPole(pole);
        appendPole(i);
    });

    $("#editing-rods").on("click", ".delete-pole", function() {
        var i = parseInt($(this).data('i'));
        removePole(i);
        $(".edit-pole").remove();
        displayPoles();
    });

    $("#editing-rods").on("click", ".delete-rod", function() {
        var $this = $(this);
        var i = parseInt($this.parents(".edit-pole").data('i'));
        var j = parseInt($this.data('i'));
        deleteRod(i, j);
        $("#edit-pole" + i + " .rod-row").remove();
        displayRods($("#edit-pole" + i + " tbody"), i);
    });

    $("#editing-rods").on("click", ".add-rod", function() {
        var i = parseInt($(this).data('i'));
        var pole = getPoles()[i];
        var rod = {r: 0, theta: 0, height: 3, color: 'R'};
        pole.rods.push(rod);
        setPole(i, pole);
        appendRod($("#edit-pole" + i + " tbody"), pole.rods.length - 1, rod);
    });

    $("#render-poles-check input").on("change", function() {
        localStorage["renderPoles"] = $(this).is(':checked');
        $(window).trigger("polesChanged");
    });

    $("#editing-rods").on("keyup change", ".rod-val, .rod-slider", function() {
        var $this = $(this), val = $this.val();
        $("input", $(this).parent()).val(val);
        var i = parseInt($this.parents(".edit-pole").data('i'));
        var j = parseInt($this.data('i'));
        if ($this.hasClass("radius")) {
            updateRod(i, j, "r", val);
        } else if ($this.hasClass("theta")) {
            updateRod(i, j, "theta", val);
        } else if ($this.hasClass("color")) {
            updateRod(i, j, "color", val);
        } else if ($this.hasClass("height")) {
            updateRod(i, j, "height", val);
        }
    });

    $(window).on("polesChanged", function() {
        rodsThree.forEach(function(r) {
            scene.remove(r);
        });
        rodsThree = [];
        polesThree.forEach(function(r) {
            scene.remove(r);
        });
        polesThree = [];
        var poles = getPoles();
        for (var i in poles) {
            var pole = poles[i];
	    // Yes, I switched the order. No, I don't know why.
            var x0 = pole.pos[1] + 2, y0 = pole.pos[0] + 2;
            var renderPoles = JSON.parse(localStorage["renderPoles"]);

            if (renderPoles) {
                var geom = new THREE.CylinderGeometry(0.05, 0.05, 1, 32, 1, false);
                var material = new THREE.MeshLambertMaterial({color: 0x000000});
                var mesh = new THREE.Mesh(geom, material);
                mesh.position.set(x0, 1 / 2, y0);
                scene.add(mesh);
                polesThree.push(mesh);
            }

            pole.rods.forEach(function(rod) {
                var angle = -rod.theta * Math.PI / 180 + Math.PI / 2;
                var x = x0 + rod.r * Math.cos(angle),
                    y = y0 + rod.r * Math.sin(angle),
                    height = rod.height;
                var geom = new THREE.CylinderGeometry(0.125, 0.125, height, 32, 1, false);
                var material = makeMaterial(rod.color);
                var mesh = new THREE.Mesh(geom, material);
                mesh.position.set(x, height / 2 + 0.01, y);
		mesh.color = rod.color;
                scene.add(mesh);
                rodsThree.push(mesh);
                if (renderPoles) {
                    var lineMat = new THREE.LineBasicMaterial({color: 0x00ff00});
                    var lineGeom = new THREE.Geometry();
                    lineGeom.vertices.push(new THREE.Vector3(x0, 0.01, y0));
                    lineGeom.vertices.push(new THREE.Vector3(x, 0.01, y));
                    var line = new THREE.Line(lineGeom, lineMat);
                    scene.add(line);
                    polesThree.push(line);
                }
/*
                var led = new THREE.PointLight(0xff0000);
                led.position.set(x, height / 2, y);
                led.intensity = 0.1;
                led.target = mesh;
*/
            });
        }
    });
}

function initCode() {
    var editor = ace.edit("editor");
    editor.setTheme("ace/theme/solarized_dark");
    editor.getSession().setMode("ace/mode/c_cpp");

    $("#edit-code").click(function(event) {
        editing = true;
        $("#editor-container").toggle();
    });

    $("#run-btn").click(function(event) {
        editing = false;
        $("#editor-container").toggle();
	var code = "#include <Arduino.h>\n" + editor.getValue();
        worker = new Worker("picoc.js");
	console.log("started worker!");
        worker.onmessage = function(event) {
            if ("pin" in event.data && "brightness" in event.data) {
                setRodBrightness(event.data.pin, event.data.brightness);
            } else {
                console.log("received message");
                console.log(event);
            }
        };
        $("#potentiometer").change(function(event) {
            console.log(event);
            worker.postMessage({pot: $("#potentiometer").val()});
        });
        worker.postMessage({code: code});
	console.log("sent code!");
        worker.postMessage({pot: $("#potentiometer").val()});
    });
}

function initThree() {
    scene = new THREE.Scene();
    var WIDTH = window.innerWidth,
        HEIGHT = window.innerHeight;

    renderer = new THREE.WebGLRenderer({antialias: true});
    renderer.setSize(WIDTH, HEIGHT);
    renderer.setFaceCulling(THREE.CullFaceNone);
    $("#glcanvas").append(renderer.domElement);

    camera = new THREE.PerspectiveCamera(45, WIDTH / HEIGHT, 0.1, 20000);
    camera.position.set(-4, 6, 0);
    scene.add(camera);

    window.addEventListener("resize", function() {
        var WIDTH = window.innerWidth,
            HEIGHT = window.innerHeight;
        renderer.setSize(WIDTH, HEIGHT);
        camera.aspect = WIDTH / HEIGHT;
        camera.updateProjectionMatrix();
    });

    renderer.setClearColorHex(0xaaaaaa, 1);

    var light = new THREE.PointLight(0xffffff);
    light.position.set(-10, 10, -10);
    light.intensity = 0.5;
    scene.add(light);

    var mapHeight = THREE.ImageUtils.loadTexture("bumpmap.jpg");
    mapHeight.anisotropy = 4;
    mapHeight.repeat.set(0.998, 0.998);
    mapHeight.offset.set(0.001, 0.001);
    mapHeight.wrapS = mapHeight.wrapT = THREE.RepeatWrapping;
    mapHeight.format = THREE.RGBFormat;

    var baseGeom = new THREE.CubeGeometry(4, 2, 4);
    var baseMat = new THREE.MeshPhongMaterial({color: 0xffffff});
    var base = new THREE.Mesh(baseGeom, baseMat);
    base.position.set(0, -1, 0);
    scene.add(base);

    var tableGeom = new THREE.CubeGeometry(8, 1, 12);
    var tableMat = new THREE.MeshPhongMaterial({color: 0xD2B48C});
    var table = new THREE.Mesh(tableGeom, tableMat);
    table.position.set(0, -2.5, 0);
    scene.add(table);

    var wallGeom = new THREE.CubeGeometry(1, 8, 12);
    var wallMat = new THREE.MeshPhongMaterial({color: 0xffffff});
    var wall = new THREE.Mesh(wallGeom, wallMat);
    wall.position.set(3, 0, 0);
    //scene.add(wall);

    var path = "textures/";
    var format = '.jpg';
    var urls = [
        path + 'px' + format, path + 'nx' + format,
        path + 'py' + format, path + 'ny' + format,
        path + 'pz' + format, path + 'nz' + format
    ];
    textureCube = THREE.ImageUtils.loadTextureCube(urls);

    $(window).trigger("polesChanged");

    controls = new THREE.OrbitControls(camera, renderer.domElement);
}

function animate() {
    requestAnimationFrame(animate);

    renderer.render(scene, camera);
    controls.update();
}
