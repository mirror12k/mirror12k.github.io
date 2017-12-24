

function image_colorize (image, fill_style) {
	var buffer_canvas = document.createElement('canvas');
	buffer_canvas.width = image.width;
	buffer_canvas.height = image.height;
	var buffer_context = buffer_canvas.getContext('2d');
	buffer_context.imageSmoothingEnabled = false;

	buffer_context.fillStyle = fill_style;
	buffer_context.fillRect(0,0, buffer_canvas.width, buffer_canvas.height);

	buffer_context.globalCompositeOperation = "destination-atop";
	buffer_context.drawImage(image, 0, 0);

	return buffer_canvas;
}

function image_composite(bottom_image, top_image) {
	var buffer_canvas = document.createElement('canvas');
	buffer_canvas.width = bottom_image.width;
	buffer_canvas.height = bottom_image.height;
	var buffer_context = buffer_canvas.getContext('2d');
	buffer_context.imageSmoothingEnabled = false;

	buffer_context.drawImage(bottom_image, 0, 0);
	buffer_context.drawImage(top_image, 0, 0);

	return buffer_canvas;
}

function image_flip(image) {
	var buffer_canvas = document.createElement('canvas');
	buffer_canvas.width = image.width;
	buffer_canvas.height = image.height;
	var buffer_context = buffer_canvas.getContext('2d');
	buffer_context.imageSmoothingEnabled = false;

	buffer_context.translate(image.width, 0);
	buffer_context.scale(-1, 1);
	buffer_context.drawImage(image, 0, 0);

	return buffer_canvas;
}


function ConfettiParticleEffectSystem(game, config) {
	ScreenEntity.call(this, game);
	this.stroke_style = config.stroke_style || '#fff';
	this.stroke_transition = config.stroke_transition;
	this.modulate_width = config.modulate_width;

	// this.particle_longevity = config.particle_longevity || 0.05;
	this.particle_base_timer = config.particle_base_timer || 0;
	this.particle_max_timer = config.particle_max_timer || 20;

	this.particles = [];
}
ConfettiParticleEffectSystem.prototype = Object.create(ScreenEntity.prototype);
ConfettiParticleEffectSystem.prototype.constructor = ConfettiParticleEffectSystem;
ConfettiParticleEffectSystem.prototype.class_name = 'ConfettiParticleEffectSystem';
ConfettiParticleEffectSystem.prototype.add_particle = function(start, end, width) {
	var new_particle = {
		start: start,
		end: end,
		width: width || 1,
		timer: Math.floor(Math.random() * this.particle_base_timer),
	};
	this.particles.push(new_particle);

	return new_particle;
};
ConfettiParticleEffectSystem.prototype.update = function(game) {
	for (var i = this.particles.length - 1; i >= 0; i--) {
		this.particles[i].timer++;

		if (this.particles[i].timer >= this.particle_max_timer) {
			this.particles.splice(i, 1);
		}
	}
};
ConfettiParticleEffectSystem.prototype.draw = function(ctx) {
	if (this.visible) {
		// console.log("drawing ", this.particles.length, "particles");
		for (var i = 0; i < this.particles.length; i++) {
			var p = this.particles[i];
			ctx.save();

			if (this.stroke_transition) {
				var degree = p.timer / this.particle_max_timer;
				var color = [
					this.stroke_style[0] * (1 - degree) + this.stroke_transition[0] * degree,
					this.stroke_style[1] * (1 - degree) + this.stroke_transition[1] * degree,
					this.stroke_style[2] * (1 - degree) + this.stroke_transition[2] * degree,
				];
				ctx.strokeStyle = 'rgb('+color[0]+','+color[1]+','+color[2]+')';
			} else {
				ctx.strokeStyle = this.stroke_style;
			}

			if (this.modulate_width)
				ctx.lineWidth = this.particles[i].width * (1 - this.particles[i].timer / this.particle_max_timer);
			else
				ctx.lineWidth = p.width;
			
			ctx.beginPath();
			ctx.moveTo(p.start.px, p.start.py);
			ctx.lineTo(p.end.px, p.end.py);
			ctx.stroke();

			ctx.restore();
		}
	}
};









function FighterJetBlue(game, px, py, path) {
	PathEntity.call(this, game, px, py, 32, 32, 
		image_composite(image_colorize(game.images.fighter_jet_coloring, this.color), game.images.fighter_jet_base), path);
	this.missile_store = 1;

	this.dead = false;
	this.sy = 0;
	this.angle_granularity = 5;
}
FighterJetBlue.prototype = Object.create(PathEntity.prototype);
FighterJetBlue.prototype.color = '#73f';
FighterJetBlue.prototype.update = function(game) {
	PathEntity.prototype.update.call(this, game);
	var self = this;
	
	// targeting and attacking
	var enemies = game.find_near(this, FighterJetRed, 600);
	enemies = enemies.filter(function (other) { return points_dist(self, other) > 300 && self.px < other.px; });
	if (enemies.length > 0 && this.missile_store > 0 && Math.random() < 0.1) {
		this.missile_store--;
		game.entities_to_add.push(new AirMissile(game, this.px, this.py, this.color, enemies[0]));
	}

	// death spiral
	if (this.dead) {
		this.sy += 0.1;
		this.py += this.sy;

		this.angle = point_angle(0, 0, this.path[0].sx, this.sy);

		var offset = point_offset(180 + this.angle, this.width / 2);
		game.particle_systems.large_smoke_particles.add_particle(this.px + offset.px, this.py + offset.py, 2);
	}
	
	// death plane
	if (this.py >= 300) {
		game.entities_to_remove.push(this);
	}

	var offset = point_offset(180 + this.angle, this.width / 2);
	game.particle_systems.fire_particles.add_particle(this.px + offset.px, this.py + offset.py, 1);
};
FighterJetBlue.prototype.hit = function(game, other) {
	this.dead = true;
	for (var i = 0; i < 20; i++) {
		game.particle_systems.large_smoke_particles.add_particle(this.px, this.py, 1.5);
		game.particle_systems.fire_particles.add_particle(this.px, this.py, 2);
	}
};

function FighterJetRed(game, px, py, path) {
	PathEntity.call(this, game, px, py, 32, 32, 
		image_flip(image_composite(image_colorize(game.images.fighter_jet_coloring, this.color), game.images.fighter_jet_base)), path);
	this.flare_store = 8;

	this.dead = false;
	this.sy = 0;
	this.angle_granularity = 5;
}
FighterJetRed.prototype = Object.create(PathEntity.prototype);
FighterJetRed.prototype.color = '#f33';
FighterJetRed.prototype.update = function(game) {
	PathEntity.prototype.update.call(this, game);

	var self = this;

	// detection and flare evasion
	var missiles = game.find_near(this, AirMissile, 400);
	missiles = missiles.filter(function (other) { return other.target === self; });
	if (missiles.length > 0 && this.flare_store > 0 && Math.random() < 0.5) {
		this.flare_store--;
		var flare_ent = new AirFlare(game, this.px, this.py, [
			{ timeout: 40 + Math.random() * 40, sy: 1.5, sx: this.path[0].sx + Math.random() * 3 - 1.5 }]);
		game.entities_to_add.push(flare_ent);
		if (Math.random() < 0.08) {
			missiles[0].target = flare_ent;
		}
	}

	// death spiral
	if (this.dead) {
		this.sy += 0.1;
		this.py += this.sy;

		this.angle = point_angle(0, 0, -this.path[0].sx, -this.sy);

		var offset = point_offset(this.angle, this.width / 2);
		game.particle_systems.large_smoke_particles.add_particle(this.px + offset.px, this.py + offset.py, 2);
	}

	// death plane
	if (this.py >= 300) {
		game.entities_to_remove.push(this);
	}

	var offset = point_offset(this.angle, this.width / 2);
	game.particle_systems.fire_particles.add_particle(this.px + offset.px, this.py + offset.py, 1);

	// game.particle_systems.flare_particles.add_particle(this.px + offset.px, this.py + offset.py, 2);

};
FighterJetRed.prototype.hit = function(game, other) {
	this.dead = true;
	for (var i = 0; i < 20; i++) {
		game.particle_systems.large_smoke_particles.add_particle(this.px, this.py, 1.5);
		game.particle_systems.fire_particles.add_particle(this.px, this.py, 2);
	}
};

function AATankRed(game, px, py, path) {
	PathEntity.call(this, game, px, py, 48, 48, 
		image_flip(image_composite(image_colorize(game.images.aa_tank_coloring, this.color), game.images.aa_tank_base)), path);

	this.fire_timer = 0;
	// this.dead = false;
	// this.sy = 0;
	// this.angle_granularity = 5;
}
AATankRed.prototype = Object.create(PathEntity.prototype);
AATankRed.prototype.color = '#f33';
AATankRed.prototype.update = function(game) {
	PathEntity.prototype.update.call(this, game);

	var self = this;

	if (this.fire_timer > 0) {
		this.fire_timer--;
	}

	// find the target
	var targets = game.find_near(this, FighterJetBlue, 800);
	targets = targets.filter(function (other) { return other.px < self.px; });
	if (targets.length > 0 && this.fire_timer <= 0) {
		this.fire_timer = 10;
		var bullet_speed = 10;

		var target = targets[0];
		// calculate where the target will be after bullet flight time
		var flight_time = points_dist(this, target) / bullet_speed;
		var target_offset = { px: target.path[0].sx * flight_time, py: target.path[0].sy * flight_time };
		target = { px: target.px + target_offset.px, py: target.py + target_offset.py };

		// set the bullet on it's path
		var angle = point_angle(this.px, this.py, target.px, target.py) + Math.random() * 5 - 2.5;
		var bullet = new AABullet(game, this.px, this.py, [{ timeout: 60, speed: bullet_speed, angle: angle }]);
		game.entities_to_add.push(bullet);
	}
};
AATankRed.prototype.hit = function(game, other) {
	game.entities_to_remove.push(this);
	for (var i = 0; i < 20; i++) {
		game.particle_systems.large_smoke_particles.add_particle(this.px, this.py, 1.5);
	}
};



function PTBoatBlue(game, px, py, path) {
	PathEntity.call(this, game, px, py, 96, 96, 
		image_composite(image_colorize(game.images.pt_boat_coloring, this.color), game.images.pt_boat_base), path);
	// this.missile_store = 1;

	this.dead = false;
	this.sy = 0;
	this.angle_granularity = 2;
	this.swing = 0;
}
PTBoatBlue.prototype = Object.create(PathEntity.prototype);
PTBoatBlue.prototype.color = '#73f';
PTBoatBlue.prototype.update = function(game) {
	PathEntity.prototype.update.call(this, game);
	var self = this;

	this.swing = (this.swing + 2) % 360;
	this.angle = Math.sin(this.swing / 180 * Math.PI) * 4;
};


function CruiseMissilePTBoatBlue(game, px, py, path) {
	PathEntity.call(this, game, px, py, 96, 96, 
		image_composite(image_colorize(game.images.pt_boat_coloring, this.color), game.images.pt_boat_base), path);
	// this.missile_store = 1;


	this.missile_decoration = new ScreenEntity(game, this.width / 4, 10, 32, 32,
		image_composite(image_colorize(game.images.sam_missile_coloring, this.color), game.images.sam_missile_base));
	this.missile_decoration.angle = -15;
	this.missile_decoration.z_index = -1;
	this.sub_entities.push(this.missile_decoration);

	this.missiles_loaded = 1;
	this.reload = 0;
	this.lock_on = 0;

	this.dead = false;
	this.sy = 0;
	this.angle_granularity = 2;
	this.swing = 0;
}
CruiseMissilePTBoatBlue.prototype = Object.create(PathEntity.prototype);
CruiseMissilePTBoatBlue.prototype.color = '#73f';
CruiseMissilePTBoatBlue.prototype.update = function(game) {
	PathEntity.prototype.update.call(this, game);
	var self = this;

	this.swing = (this.swing + 2) % 360;
	this.angle = Math.sin(this.swing / 180 * Math.PI) * 4;

	var self = this;

	// targeting and attacking
	var enemies = game.find_near(this, AATankRed, 800);
	if (enemies.length > 0 && this.missiles_loaded > 0) {
		this.lock_on++;
		if (this.lock_on === 240) {
			this.lock_on = 0;
			this.missiles_loaded--;

			var offset = d2_point_offset(this.angle, this.missile_decoration.px, this.missile_decoration.py);
			game.entities_to_add.push(new CruiseMissile(game, this.px + offset.px, this.py + offset.py, this.color, enemies[0], this.py - 40));
		}
	} else {
		this.lock_on = 0;
	}

	// reloading
	if (this.missiles_loaded < 1) {
		this.reload++;
		if (this.reload >= 180) {
			this.reload = 0;
			this.missiles_loaded++;
		}
	}

	this.missile_decoration.visible = this.missiles_loaded > 0;
};



function SoldierBlue(game, px, py, path) {
	PathEntity.call(this, game, px, py, 16, 16, 
		image_composite(image_colorize(game.images.soldier_coloring, this.color), game.images.soldier_base), path);
	this.max_frame = 4;

	// this.missile_store = 1;
	this.health = 10;
	this.dead = false;
}
SoldierBlue.prototype = Object.create(PathEntity.prototype);
SoldierBlue.prototype.color = '#73f';
SoldierBlue.prototype.update = function(game) {
	PathEntity.prototype.update.call(this, game);
	if (!this.dead) {
		this.frame = (this.frame + 1) % 4;
	}

	// var self = this;

	// this.swing = (this.swing + 2) % 360;
	// this.angle = Math.sin(this.swing / 180 * Math.PI) * 4;
};
SoldierBlue.prototype.hit = function(game) {
	if (!this.dead) {
		this.health--;
		if (this.health <= 0) {
			this.dead = true;
			this.frame = 0;
			
			this.path = [
				{ timeout: 60, angle: -90 },
			];
			this.path_index = 0;
			this.current_action = undefined;
		}
	}
};


function BunkerRed(game, px, py, path) {
	PathEntity.call(this, game, px, py, 32, 32, 
		image_composite(image_colorize(game.images.bunker_coloring, this.color), game.images.bunker_base), path);
	this.bullets_loaded_max = 3;
	this.bullets_loaded = this.bullets_loaded_max;
}
BunkerRed.prototype = Object.create(PathEntity.prototype);
BunkerRed.prototype.color = '#f33';
BunkerRed.prototype.fire = function(game) {
	var offsetx = Math.random() * 9 - 4;
	var offsety = Math.random() * 5 - 2;
	game.particle_systems.bullet_tracer_particles.add_particle({ px: this.px - this.width / 4, py: this.py + this.height / 12 },
			{ px: this.px - this.width + offsetx, py: this.py + offsety }, 2);
};
BunkerRed.prototype.update = function(game) {
	PathEntity.prototype.update.call(this, game);
	var self = this;

	var enemies = game.find_near(this, SoldierBlue, 150);
	enemies = enemies.filter(function (other) { return !other.dead && other.px < self.px; });
	if (enemies.length > 0 && this.bullets_loaded === this.bullets_loaded_max) {
		this.bullets_loaded = 0;
		this.fire(game);
		enemies[0].hit(game);
	} else if (this.bullets_loaded < this.bullets_loaded_max) {
		this.bullets_loaded++;
	}

	// var self = this;

	// this.swing = (this.swing + 2) % 360;
	// this.angle = Math.sin(this.swing / 180 * Math.PI) * 4;
};





function SAMLauncherRed(game, px, py) {
	ScreenEntity.call(this, game, px, py, 48, 48, 
		image_flip(image_composite(image_colorize(game.images.sam_launcher_coloring, this.color), game.images.sam_launcher_base)));

	this.missile_decoration = new ScreenEntity(game, 0, -4, 32, 32,
		image_composite(image_colorize(game.images.sam_missile_coloring, this.color), game.images.sam_missile_base));
	this.missile_decoration.angle = -150;
	this.missile_decoration.z_index = 1;
	this.sub_entities.push(this.missile_decoration);

	this.missiles_loaded = 1;
	this.reload = 0;
	this.lock_on = 0;
}
SAMLauncherRed.prototype = Object.create(ScreenEntity.prototype);
SAMLauncherRed.prototype.color = '#f33';
SAMLauncherRed.prototype.update = function(game) {
	ScreenEntity.prototype.update.call(this, game);

	var self = this;

	// targeting and attacking
	var enemies = game.find_near(this, FighterJetBlue, 800);
	enemies = enemies.filter(function (other) { return other.px < self.px - (self.py - other.py); });
	if (enemies.length > 0 && this.missiles_loaded > 0) {
		this.lock_on++;
		if (this.lock_on === 60) {
			this.lock_on = 0;
			this.missiles_loaded--;
			game.entities_to_add.push(new SAMMissile(game, this.px, this.py - 4, this.color, enemies[0]));
		}
	} else {
		this.lock_on = 0;
	}

	// reloading
	if (this.missiles_loaded < 1) {
		this.reload++;
		if (this.reload >= 180) {
			this.reload = 0;
			this.missiles_loaded++;
		}
	}

	this.missile_decoration.visible = this.missiles_loaded > 0;
};



function AirMissile(game, px, py, color, target) {
	ScreenEntity.call(this, game, px, py, 8, 8, 
		image_composite(image_colorize(game.images.air_missile_coloring, color), game.images.air_missile_base));
	this.target = target;
	this.speed = 4;
}
AirMissile.prototype = Object.create(ScreenEntity.prototype);
AirMissile.prototype.update = function(game) {
	ScreenEntity.prototype.update.call(this, game);

	if (Math.random() < 0.5) {
		if (this.last_particle)
			this.last_particle.start = { px: this.px, py: this.py };
		this.last_particle = game.particle_systems.blue_missile_trail_particles.add_particle(this, { px: this.px, py: this.py }, 3);
	}
	// game.particle_systems.smoke_particles.add_particle(this.px, this.py, 1);
	// game.particle_systems.fire_particles.add_particle(this.px, this.py, 1);
	
	this.angle = point_angle(this.px, this.py, this.target.px, this.target.py);
	
	var offset = point_offset(this.angle, this.speed);
	this.px += offset.px;
	this.py += offset.py;

	if (points_dist(this, this.target) < this.speed) {
		this.target.hit(game, this);
		game.entities_to_remove.push(this);
	}
};

function SAMMissile(game, px, py, color, target) {
	ScreenEntity.call(this, game, px, py, 32, 32, 
		image_composite(image_colorize(game.images.sam_missile_coloring, color), game.images.sam_missile_base));
	this.target = target;
	this.speed = 6;
	this.angle_granularity = 5;
}
SAMMissile.prototype = Object.create(ScreenEntity.prototype);
SAMMissile.prototype.update = function(game) {
	ScreenEntity.prototype.update.call(this, game);

	var offset = point_offset(this.angle, this.width / 2);
	// game.particle_systems.smoke_particles.add_particle(this.px - offset.px, this.py - offset.py, 1);
	// game.particle_systems.fire_particles.add_particle(this.px - offset.px, this.py - offset.py, 1);

	if (Math.random() < 0.5) {
		if (this.last_particle)
			this.last_particle.start = { px: this.px + offset.px, py: this.py + offset.py };
		this.last_particle = game.particle_systems.red_missile_trail_particles.add_particle(this, { px: this.px + offset.px, py: this.py + offset.py }, 5);
	}
	
	this.angle = point_angle(this.px, this.py, this.target.px, this.target.py);
	
	offset = point_offset(this.angle, this.speed);
	this.px += offset.px;
	this.py += offset.py;

	if (points_dist(this, this.target) < this.speed) {
		this.target.hit(game, this);
		game.entities_to_remove.push(this);
	}
};

function CruiseMissile(game, px, py, color, target, cruise_height) {
	ScreenEntity.call(this, game, px, py, 32, 32, 
		image_composite(image_colorize(game.images.sam_missile_coloring, color), game.images.sam_missile_base));
	this.target = target;
	this.speed = 6;
	this.angle_granularity = 5;

	this.cruise_height = cruise_height;
}
CruiseMissile.prototype = Object.create(ScreenEntity.prototype);
CruiseMissile.prototype.update = function(game) {
	ScreenEntity.prototype.update.call(this, game);

	var offset = point_offset(this.angle, this.width / 2);
	// game.particle_systems.smoke_particles.add_particle(this.px - offset.px, this.py - offset.py, 1);
	// game.particle_systems.fire_particles.add_particle(this.px - offset.px, this.py - offset.py, 1);

	if (Math.random() < 0.5) {
		if (this.last_particle)
			this.last_particle.start = { px: this.px + offset.px, py: this.py + offset.py };
		this.last_particle = game.particle_systems.blue_missile_trail_particles.add_particle(this, { px: this.px + offset.px, py: this.py + offset.py }, 5);
	}
	
	var target_point;
	if (Math.abs(this.px - this.target.px) > 100) {
		if (this.py > this.cruise_height) {
			target_point = { px: this.target.px, py: this.py - Math.abs(this.px - this.target.px) };
		} else {
			target_point = { px: this.target.px, py: this.py };
		}
	} else {
		target_point = this.target;
	}
	this.angle = point_angle(this.px, this.py, target_point.px, target_point.py);
	
	offset = point_offset(this.angle, this.speed);
	this.px += offset.px;
	this.py += offset.py;

	if (points_dist(this, this.target) < this.speed) {
		this.target.hit(game, this);
		game.entities_to_remove.push(this);
	}
};




function AABullet(game, px, py, path) {
	PathEntity.call(this, game, px, py, undefined, undefined, undefined, path);

	this.particle = game.particle_systems.bullet_tracer_particles.add_particle(this, this, 3);
	this.position_list = [];
}
AABullet.prototype = Object.create(PathEntity.prototype);
AABullet.prototype.update = function(game) {
	PathEntity.prototype.update.call(this, game);


	this.particle.timer = 0;
	this.position_list.push({ px: this.px, py: this.py });
	if (this.position_list.length >= 5) {
		this.particle.end = this.position_list.shift();
	}

	var targets = game.find_near(this, FighterJetBlue, 5);
	for (var i = 0; i < targets.length; i++) {
		targets[i].hit(game, this);
	}
};
// AABullet.prototype.hit = function(game, other) {
// 	game.entities_to_remove.push(this);
// };


function AirFlare(game, px, py, path) {
	PathEntity.call(this, game, px, py, 16, 16, game.images.particle_flare, path);
	this.max_frame = 8;
	this.frame_step = 0;
	this.last_particle = undefined;
}
AirFlare.prototype = Object.create(PathEntity.prototype);
AirFlare.prototype.update = function(game) {
	PathEntity.prototype.update.call(this, game);

	this.frame_step = (this.frame_step + 1) % 16;
	this.frame = Math.floor(this.frame_step / 2);

	if (Math.random() < 0.25) {
		if (this.last_particle)
			this.last_particle.start = { px: this.px, py: this.py };
		this.last_particle = game.particle_systems.flare_trail_particles.add_particle(this, { px: this.px, py: this.py }, 5);
	}
};
AirFlare.prototype.hit = function(game, other) {
	game.entities_to_remove.push(this);
};







function SpawnerSystem(game, cycle_paths) {
	PathEntity.call(this, game, 0,0);
	this.cycle_paths = cycle_paths;
	for (var i = 0; i < this.cycle_paths.length; i++) {
		this.cycle_paths[i].max_timeout = this.cycle_paths[i].timeout;
	}
}
SpawnerSystem.prototype = Object.create(PathEntity.prototype);
SpawnerSystem.prototype.update = function(game) {
	for (var i = 0; i < this.cycle_paths.length; i++) {
		this.cycle_paths[i].timeout--;
		if (this.cycle_paths[i].timeout <= 0) {
			this.trigger_path_action(game, this.cycle_paths[i].action);
			this.cycle_paths[i].timeout = this.cycle_paths[i].max_timeout;
		}
	}
};
SpawnerSystem.prototype.draw = function(ctx) {};


function TileRenderer(game, sizex, sizey, width, height, tilesheet, tile_sizex, tile_sizey) {
	RenderedGridSystem.call(this, game, sizex, sizey, width, height);
	this.tilesheet = tilesheet;
	this.tile_sizex = tile_sizex;
	this.tile_sizey = tile_sizey;
	this.tile_maxframe_x = tilesheet.width / tile_sizex;
}
TileRenderer.prototype = Object.create(RenderedGridSystem.prototype);
TileRenderer.prototype.render_rect = function(ctx, p, w, h) {
	for (var x = p[0]; x < p[0] + w; x++) {
		for (var y = p[1]; y < p[1] + h; y++) {
			if (this.grid[x][y] >= 0) {
				var framex = this.grid[x][y] % this.tile_maxframe_x;
				var framey = Math.floor(this.grid[x][y] / this.tile_maxframe_x);
				// console.log("debug render:", x, y, framex, framey);

				ctx.save();
				ctx.translate(x * this.width, y * this.height);
				ctx.clearRect(0, 0, this.width, this.height);
				ctx.drawImage(this.tilesheet, this.tile_sizex * framex, this.tile_sizey * framey, this.tile_sizex, this.tile_sizey,
						0, 0, this.width, this.height);
				ctx.restore();
			} else {
				ctx.save();
				ctx.translate(x * this.width, y * this.height);
				ctx.clearRect(0, 0, this.width, this.height);
				ctx.restore();
			}
		}
	}
};


function TileEditor(game, width, height, tilesheet, tile_sizex, tile_sizey, target_system) {
	Entity.call(this, game);
	this.width = width;
	this.height = height;
	this.tilesheet = tilesheet;
	this.tile_sizex = tile_sizex;
	this.tile_sizey = tile_sizey;
	this.tile_maxframe_x = tilesheet.width / tile_sizex;

	this.target_system = target_system;
	this.tile_selected = 0;
}
TileEditor.prototype = Object.create(Entity.prototype);
TileEditor.prototype.update = function(game) {
	Entity.prototype.update.call(this, game);

	this.tile_position = game.mouse_position;
	if (game.mouse1_state) {
		var p = game.game_systems[this.target_system].get_point(game.mouse_position.px, game.mouse_position.py);
		game.game_systems[this.target_system].rect_set(p, 1, 1, this.tile_selected);
	}

	if (game.keystate.Q && !game.previous_keystate.Q) {
		this.tile_selected--;
	}

	if (game.keystate.E && !game.previous_keystate.E) {
		this.tile_selected++;
	}

	if (game.keystate.Y && !game.previous_keystate.Y) {
		console.log(JSON.stringify(game.game_systems[this.target_system].grid));
	}
};
TileEditor.prototype.draw = function(ctx) {
	if (this.visible) {
		ctx.save();

		ctx.globalAlpha = this.alpha;

		ctx.translate(this.tile_position.px, this.tile_position.py);
		ctx.rotate(Math.PI * (Math.floor(this.angle / this.angle_granularity) * this.angle_granularity) / 180);

		for (var i = 0; i < this.sub_entities.length; i++) {
			if (this.sub_entities[i].z_index < this.z_index)
				this.sub_entities[i].draw(ctx);
		}

		if (this.tilesheet) {
			var framex = this.tile_selected % this.tile_maxframe_x;
			var framey = Math.floor(this.tile_selected / this.tile_maxframe_x);

			ctx.drawImage(this.tilesheet,
				framex * this.tile_sizex, framey * this.tile_sizey, this.tile_sizex, this.tile_sizey,
				0, 0, this.width, this.height);
		}

		for (var i = 0; i < this.sub_entities.length; i++) {
			if (this.sub_entities[i].z_index >= this.z_index)
				this.sub_entities[i].draw(ctx);
		}

		ctx.restore();
	}
};




function main () {
	var canvas = document.querySelector('#game_canvas');
	var ctx = canvas.getContext('2d');
	ctx.imageSmoothingEnabled = false;



	var images = {
		ufo: "assets/ufo.png",

		fighter_jet_base: "assets/fighter_jet_base.png",
		fighter_jet_coloring: "assets/fighter_jet_coloring.png",
		pt_boat_base: "assets/pt_boat_base.png",
		pt_boat_coloring: "assets/pt_boat_coloring.png",
		aa_tank_base: "assets/aa_tank_base.png",
		aa_tank_coloring: "assets/aa_tank_coloring.png",
		sam_launcher_base: "assets/sam_launcher_base.png",
		sam_launcher_coloring: "assets/sam_launcher_coloring.png",
		air_missile_base: "assets/air_missile_base.png",
		air_missile_coloring: "assets/air_missile_coloring.png",
		sam_missile_base: "assets/sam_missile_base.png",
		sam_missile_coloring: "assets/sam_missile_coloring.png",
		soldier_base: "assets/soldier_base.png",
		soldier_coloring: "assets/soldier_coloring.png",
		bunker_base: "assets/bunker_base.png",
		bunker_coloring: "assets/bunker_coloring.png",

		background_tiles: "assets/background_tiles.png",

		particle_steam: "assets/particle_steam.png",
		particle_flare: "assets/particle_flare.png",
	};

	load_all_images(images, function () {
		console.log("all images loaded");


		var game = new GameSystem(canvas, images);

		game.game_systems.background_renderer = new TileRenderer(game, 640 / 32, 480 / 32, 32, 32, game.images.background_tiles, 16, 16);
		// game.game_systems.background_renderer.set_grid(game.game_systems.background_renderer.generate_grid(12));
		game.game_systems.background_renderer.set_grid([
			[4,4,4,4,4,4,4,4,4,4,8,12,12,12,12],
			[4,4,4,4,4,4,4,4,4,4,8,12,12,12,12],
			[4,4,4,4,4,4,4,4,4,4,8,12,12,12,12],
			[4,4,4,4,4,4,4,4,4,4,8,12,12,12,12],
			[4,4,4,4,4,4,4,4,4,4,8,12,12,12,12],
			[4,4,4,4,4,4,4,4,4,4,8,12,12,12,12],
			[4,4,4,4,4,4,4,4,4,4,8,12,12,12,12],
			[4,4,4,4,4,4,4,4,4,4,8,12,12,12,12],
			[4,4,4,4,4,4,4,4,4,4,8,12,12,12,12],
			[4,4,4,4,4,4,4,4,4,4,8,12,12,12,12],
			[4,4,4,4,4,4,4,4,4,4,8,12,12,12,12],
			[4,4,4,4,4,4,4,4,4,4,9,13,13,13,13],
			[4,4,4,4,4,4,4,4,4,4,10,14,14,14,14],
			[4,4,4,4,4,4,4,4,4,4,10,14,14,14,14],
			[4,4,4,4,4,4,4,4,4,4,10,14,14,14,14],
			[4,4,4,4,4,4,4,4,4,4,10,14,14,14,14],
			[4,4,4,4,4,4,4,4,4,4,10,14,14,14,14],
			[4,4,4,4,4,4,4,4,4,4,10,14,14,14,14],
			[4,4,4,4,4,4,4,4,4,4,10,14,14,14,14],
			[4,4,4,4,4,4,4,4,4,4,10,14,14,14,14]
		]);
		game.game_systems.background_renderer.z_index = -1;
		// game.game_systems.tile_editor = new TileEditor(game, 32, 32, game.images.background_tiles, 16, 16, 'background_renderer');

		game.game_systems.spawner_system = new SpawnerSystem(game, [
			{ timeout: 120, action: { spawn_entity: [
				{ class: FighterJetBlue, px: -32, py: 70, args: [ [{ timeout: 360, sx: 2.5 }], ] },
			]}},
			{ timeout: 150, action: { spawn_entity: [
				{ class: FighterJetRed, px: 640 + 32, py: 150, args: [ [{ timeout: 360, sx: -2.5 }], ] },
			]}},
			{ timeout: 600, action: { spawn_entity: [
				{ class: AATankRed, px: 640 + 32, py: 430, args: [ [
					{ timeout: 300, sx: -1 },
					{ timeout: 180 },
				], ] },
			]}},
			{ timeout: 300, action: { spawn_entity: [
				{ class: PTBoatBlue, px: -32, py: 385, args: [ [
					{ timeout: 330, sx: 1 },
					{ timeout: 20, repeat: 3, spawn_entity: [{ class: SoldierBlue, px: 64, args: [[
						{ timeout: 240, sx: 1 },
					]] }] },
					{ timeout: 60 },
				], ] },
			]}},
		]);
		game.particle_systems.smoke_particles = new ParticleEffectSystem(game, {
			fill_style: '#aaa',
			particle_image: game.images.particle_steam,
			particle_longevity: 0.1,
			particle_size: 8,
		});
		game.particle_systems.large_smoke_particles = new ParticleEffectSystem(game, {
			fill_style: '#222',
			particle_image: game.images.particle_steam,
			particle_longevity: 0.05,
			particle_size: 24,
		});
		game.particle_systems.fire_particles = new ParticleEffectSystem(game, {
			fill_style: '#d80',
			particle_image: game.images.particle_steam,
			particle_longevity: 0.4,
			particle_size: 8,
		});
		game.particle_systems.flare_trail_particles = new ConfettiParticleEffectSystem(game, {
			stroke_style: '#a84',
			modulate_width: true,
		});
		game.particle_systems.bullet_tracer_particles = new ConfettiParticleEffectSystem(game, {
			stroke_style: '#da6',
			particle_max_timer: 2,
		});
		game.particle_systems.blue_missile_trail_particles = new ConfettiParticleEffectSystem(game, {
			stroke_style: [0x77, 0x33, 0xff],
			stroke_transition: [0xff, 0xff, 0xff],
			particle_max_timer: 40,
			modulate_width: true,
		});
		game.particle_systems.red_missile_trail_particles = new ConfettiParticleEffectSystem(game, {
			stroke_style: [0xff, 0x33, 0x33],
			stroke_transition: [0xff, 0xff, 0xff],
			particle_max_timer: 40,
			modulate_width: true,
		});
		// game.particle_systems.flare_particles = new ParticleEffectSystem(game, {
		// 	particle_image: game.images.particle_flare,
		// 	particle_size: 16,
		// 	frame_step: 0.5,
		// 	particle_sy: -4,
		// 	max_frame: 8,
		// });

		// game.entities.push(new FighterJetRed(game, 640, 100, [ { sx: -3 }]));
		// game.entities.push(new FighterJetBlue(game, -20, 150, [ { sx: 2.5 }]));
		game.entities.push(new SAMLauncherRed(game, 580, 350));
		game.entities.push(new BunkerRed(game, 550, 380));
		game.entities.push(new CruiseMissilePTBoatBlue(game, 50, 420));

		setInterval(game.step_game_frame.bind(game, ctx), 1000 / 60);
	});
}

window.addEventListener('load', main);
