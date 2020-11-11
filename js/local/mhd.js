function MHD(numPoints) {

	/*
	The time step looks like:
	dw/dt = H(w,t)
	k1 = dt*H(w(n),     t(n)    )
	k2 = dt*H(w(n)+k1/2,t(n+1/2))
	k3 = dt*H(w(n)+k2/2,t(n+1/2))
	k4 = dt*H(w(n)+k3,  t(n)    )
	w(n+1) = w(n) + k1/6 + k2/3 + k3/3 + k4/6
	 */

	this.c = 3.0E10; // speed of light, using cgs units throughout.
	this.BOUNDARY_COUNT = 5; // This many points will be beyond the boundaries to the left and right of the simulation region
	this.NUM_VARS = 7;
	this.array_size = 0; // The actual size of the array
	this.maxPoints = numPoints; // The number of points in the simulation region, excludes boundary points
	this.minX = 0; // The minimum index into the array that is in the simulation region
	this.maxX = 0; // The index into the array that is one past the simulation region, so that loops look like i<maxX
	this.w = [];
	this.w = new Array(this.NUM_VARS); // w0][] = dens, w[1][] = pressure, w[2][] = vx, w[3][] = vy,
	//w[4][] = vz, w[5][] = By, w[6][] = Bz
	this.w_temp = new Array(this.NUM_VARS);
	this.w_next = new Array(this.NUM_VARS);
	this.dw = new Array(this.NUM_VARS); // temp for calculating spatial derivatives
	this.kr = new Array(this.NUM_VARS);

	this.array_size = this.maxPoints + 2 * this.BOUNDARY_COUNT - 1;
	for (var i = 0; i < this.NUM_VARS; ++i) {
		this.w[i] = new Array(this.array_size); // w0][] = dens, w[1][] = pressure, w[2][] = vx, w[3][] = vy,
		//w[4][] = vz, w[5][] = By, w[6][] = Bz
		this.w_temp[i] = new Array(this.array_size);
		this.w_next[i] = new Array(this.array_size);
		this.dw[i] = new Array(this.array_size);
		this.kr[i] = new Array(this.array_size);
	}
	this.Bx; // constant for 1D
	// double jx[]; 0 for 1-D
	this.jy = new Array(this.array_size);
	this.jz = new Array(this.array_size);
	this.gamma = 0;
	this.dx = 1;
	this.didInit = false;

	if (numPoints < 3 * this.BOUNDARY_COUNT) {
		numPoints = 3 * this.BOUNDARY_COUNT; // force at least BOUNDARY_COUNT simulation points.
	}
	this.minX = this.BOUNDARY_COUNT;
	this.maxX = this.maxPoints + this.BOUNDARY_COUNT;

	//Bx = new double[array_size]; Bx = constant
	this.jy = new Array(this.array_size);
	this.jz = new Array(this.array_size);

	// Initialize with constant fields.
	// Variation comes by calling addPerturbation.
	this.init = function (Bx_in, By_in, Bz_in, dens_in, pressure_in,
		vx_in, vy_in, vz_in, gamma_in, dx_in) {

		this.gamma = gamma_in;
		this.dx = dx_in;
		this.Bx = Bx_in;
		for (var i = 0; i < this.array_size; ++i) {
			this.w[0][i] = dens_in;
			this.w[1][i] = pressure_in;
			this.w[2][i] = vx_in;
			this.w[3][i] = vy_in;
			this.w[4][i] = vz_in;
			this.w[5][i] = By_in;
			this.w[6][i] = Bz_in;
		}
		this.didInit = true;

		this.calc_current(this.w[5], this.w[6]);
	}

	/**
	 * Add an Alfven wave to the model.
	 * @param percentDb amplitude of Alfven wave magnetic field, as percent of background magnetic field
	 * @param numWaves
	 */
	/*
	public void addAlfvenWave(double percentDb, int numWaves){
	// the spatial part of the wave will look like sin(numPointsInSimulation/numWaves)
	if (numWaves < 1)
	return;

	double ds = maxPoints/numWaves;


	}
	 */

	/**
	 * Add a simple gaussian perturbation to By
	 * @param percentDb: Amplitude of perturbation as percent of background field
	 * @param numGridPoints: half width of tent
	 */
	this.addByPerturbation = function (percentDb, numGridPoints) {
		// Assume for now that the background magnetic field is uniform.
		var positionFrac = 4; // 2 = middle, 4= quarter way
		var B = Math.sqrt(this.Bx * this.Bx +
				this.w[5][this.maxPoints / positionFrac] * this.w[5][this.maxPoints / positionFrac] +
				this.w[6][this.maxPoints / positionFrac] * this.w[6][this.maxPoints / positionFrac]);
		numGridPoints = Math.min(numGridPoints, this.maxPoints / 4);
		var dB = percentDb * B / 100;
		// pressure * density^gamma = constant
		// assume constant density to start.
		var pConst = this.w[1][0] * Math.pow(this.w[0][0], this.gamma);
		var dDens = percentDb * this.w[0][0] /100 ;

		var x0 = this.array_size * this.dx / positionFrac;
		var deltaX = numGridPoints * this.dx;
		var currentX;
		var power;
		for (var i = 0; i < this.array_size; ++i) {
			currentX = i * this.dx;
			power = (currentX - x0) / deltaX;
			var exp = Math.exp( - (power * power));
			this.w[5][i] +=  dB * exp
			
			// and for fun, let's perturb density
			//this.w[0][i] += dDens * exp;
			//this.w[1][i] = pConst/Math.pow(this.w[0][i], this.gamma);
		}

	}

	/**
	 * This is the method to call to advance the simulation.
	 * @param nt Take nt time steps.
	 */
	this.takeTimeSteps = function (nt) {
		if (!this.didInit) {
			console.log("You must initialize the variables before taking a time step");
			return;
		}
		if (nt < 1) {
			return;
		}

		for (var i = 0; i < nt; ++i) {
			var dt = this.calculateAllowableTimeStep();
			this.timeStep(dt);
		}
	}

	/**
	 * for internal use only. Use takeTimeSteps to advance the simulation.
	 * Advance w (array containing model variables) by time dt.
	 * @param dt
	 */
	this.timeStep = function (dt) {
		var i;
		var j;
		// first partial time step
		this.applyPeriodicBoundariesToAll(this.w); // probably not really needed, since we call this after each time step
		this.calculateTimeDerivative(this.w, this.kr, dt, this.dw);

		for (i = 0; i < this.NUM_VARS; ++i) {
			for (j = 0; j < this.array_size; ++j) {
				this.w_next[i][j] = this.kr[i][j];
				this.w_temp[i][j] = this.w[i][j] + this.kr[i][j] * 0.5;
			}
		}
		this.applyPeriodicBoundariesToAll(this.w_temp);
		this.applyPeriodicBoundariesToAll(this.w_next);

		// second time step
		this.calculateTimeDerivative(this.w_temp, this.kr, dt, this.dw);

		for (i = 0; i < this.NUM_VARS; ++i) {
			for (j = 0; j < this.array_size; ++j) {
				this.w_next[i][j] = this.w_next[i][j] + this.kr[i][j] * 2.0;
				this.w_temp[i][j] = this.w[i][j] + this.kr[i][j] * 0.5;
			}
		}
		this.applyPeriodicBoundariesToAll(this.w_temp);
		this.applyPeriodicBoundariesToAll(this.w_next);

		// third time step
		this.calculateTimeDerivative(this.w_temp, this.kr, dt, this.dw);

		for (i = 0; i < this.NUM_VARS; ++i) {
			for (j = 0; j < this.array_size; ++j) {
				this.w_next[i][j] = this.w_next[i][j] + this.kr[i][j] * 2.0;
				this.w_temp[i][j] = this.w[i][j] + this.kr[i][j];
			}
		}
		this.applyPeriodicBoundariesToAll(this.w_temp);
		this.applyPeriodicBoundariesToAll(this.w_next);

		// fourth time step
		this.calculateTimeDerivative(this.w_temp, this.kr, dt, this.dw);

		for (i = 0; i < this.NUM_VARS; ++i) {
			for (j = 0; j < this.array_size; ++j) {
				this.w[i][j] = this.w[i][j] + (this.w_next[i][j] + this.kr[i][j]) / 6.0;
			}
		}
		this.applyPeriodicBoundariesToAll(this.w);
	}
	/**
	 * Do a simple calculation of the fast speed, calculate a time step
	 * so the we are half that allowed by the cfl condition
	 * @return the allowable time step
	 */
	this.calculateAllowableTimeStep = function () {
		var dt = 0;
		var B2; // The square of the magnetic field
		var fast_speed; // fast speed at given point
		var fast_speed_max = 0.0; // max fast speed found in current array
		var dens;
		var min_dens = 10000000;
		var bx2 = this.Bx * this.Bx;

		// first calculate the fast speed
		for (var i = 0; i < this.array_size; ++i) {
			B2 = bx2 + this.w[5][i] * this.w[5][i] + this.w[6][i] * this.w[6][i];
			dens = this.w[0][i];
			dens = Math.max(dens, 0.1);
			min_dens = Math.min(dens, min_dens);
			fast_speed = Math.sqrt((B2 + this.gamma * this.w[1][i]) / dens);
			fast_speed_max = Math.max(fast_speed, fast_speed_max);
		}
		fast_speed_max = Math.max(fast_speed_max, 0.01);
		dt = this.dx * 0.5 / fast_speed_max;
		dt = dt / 2;
		return dt;
	}
	/**
	 * Given B (member variable) calculate the current, store in the member variables
	 */
	this.calc_current = function (By, Bz) {
		this.applyPeriodicBoundaries(By);
		this.applyPeriodicBoundaries(Bz);
		this.derivative(Bz, this.jy);
		this.derivative(By, this.jz);
		var cOver4Pi = 0.25 * this.c / Math.PI;
		for (var i = this.minX; i < this.maxX; ++i) {
			this.jy[i] = -cOver4Pi * this.jy[i];
			this.jz[i] = cOver4Pi * this.jz[i];
		}
		this.applyPeriodicBoundaries(this.jy);
		this.applyPeriodicBoundaries(this.jz);
	}

	/**
	 *
	 * @param f function to take derivative of
	 * @param dfdx df/dx
	 * dx is a member variable, set up in init
	 */
	this.derivative = function (f, dfdx) {

		var inverse2dx = 0.5 / this.dx;
		var inverse12dx = 1.0 / (12.0 * this.dx);
		for (var i = this.minX; i < this.maxX; ++i) {
			//dfdx[i] = (f[i + 1] - f[i - 1]) * inverse2dx;
			// Higher order
			dfdx[i] = (-f[i + 2] + 8.0 * f[i + 1] - 8.0 * f[i - 1] + f[i - 2]) * inverse12dx;
		}
	}

	/**
	 * Apply periodic boundaries to one component of the overall model (i.e. w[0][] = dens)
	 * @param f
	 */
	this.applyPeriodicBoundaries = function (f) {
		for (var i = 0; i < this.BOUNDARY_COUNT; ++i) {
			f[i] = f[this.maxX - this.BOUNDARY_COUNT + i];
			f[i + this.maxX] = f[this.minX + i];
		}
	}

	/**
	 * Apply periodic boundary conditions to the entire 2D model array
	 * @param f
	 */
	this.applyPeriodicBoundariesToAll = function (f) {
		for (var i = 0; i < this.NUM_VARS; ++i) {
			this.applyPeriodicBoundaries(f[i]);
		}
	}

	/**
	 * Calculate the time derivative of the fundamental variables:
	 * dDensDt = -d(dens*vx)/dx
	 * dPressure/dt = -vx*dDens/dx - gamma*dens*dvx/dx
	 * dens*dvx/dt = -dDens/dx + 1/c * (JyBz - JzBy)
	 * dens*dvy/dt = 1/c*(JzBx - JxBz)
	 * dens*dvz/dt = 1/c*(JxBy - JyBx) (Jx == 0 in 1D)
	 * dBy/dt = d/dx(vyBx - vxBy)
	 * dBz/dt = d/dx(vzBx - vxBz)
	 * Jx = 0
	 * Jy = -c/4pi * dBz/dx
	 * Jz = c/4pi * dBy/dx
	 *
	 * @param wTemp    Input, Field variables at current time
	 * @param kr       Output, time derivative e.g dw/dt = H(w,t) k1 = dt*H(w(n),     t(n)    )
	 * @param dt       time step
	 * @param work     a work array to hold intermediate values. Same size as wTemp.
	 */

	this.calculateTimeDerivative = function (wTemp, kr, dt, work) {
		// see http://www-solar.mcs.st-and.ac.uk/~alan/sun_course/Chapter2/node6.html but switch to cgs
		// Set up the rhs (the items we will take spatial derivatives of)
		// This is a bit ugly. Use kr as a temp to take the derivative.
		for (var i = 0; i < this.array_size; ++i) {
			//dDensDt = -d(dens*vx)/dx
			kr[0][i] = wTemp[0][i] * wTemp[2][i];
			// dPressure/dt = -vx*dPressure/dx - gamma*Pressure*dvx/dx
			kr[1][i] = wTemp[1][i]; // dPressure/dx
			// dens*dvx/dt = -dens*vx*dvx/dx - dPressure/dx + 1/c * (JyBz - JzBy)
			kr[2][i] = wTemp[2][i]; // dvx/dx
			// dBy/dt = d/dx(vyBx - vxBy)
			kr[5][i] = wTemp[3][i] * this.Bx - wTemp[2][i] * wTemp[5][i];
			// dBz/dt = d/dx(vzBx - vxBz)
			kr[6][i] = wTemp[4][i] * this.Bx - wTemp[2][i] * wTemp[6][i];
		}
		// Now calculate the spatial derivatives
		this.derivative(kr[0], work[0]);
		this.derivative(kr[1], work[1]);
		this.derivative(kr[2], work[2]);
		this.derivative(kr[5], work[5]);
		this.derivative(kr[6], work[6]);

		this.calc_current(wTemp[5], wTemp[6]);

		// And finally calculate the time derivatives
		var c_inverse = 1.0 / this.c;
		for (var j = this.minX; j < this.maxX; ++j) {
			//dDensDt = -d(dens*vx)/dx
			kr[0][j] = -dt * work[0][j];
			// dPressure/dt = -vx*dPressure/dx - gamma*Pressure*dvx/dx
			kr[1][j] = dt * (-wTemp[2][j] * work[1][j] - this.gamma * wTemp[1][j] * work[2][j]);
			// dens*dvx/dt = -dens*vx*dvx/dx - dPressure/dx + 1/c * (JyBz - JzBy)
			kr[2][j] = dt * (-wTemp[2][j] * work[2][j] + (-work[1][j] + c_inverse * (this.jy[j] * wTemp[6][j] - this.jz[j] * wTemp[5][j])) / wTemp[0][j]);
			// dens*dvy/dt = 1/c*(JzBx - JxBz)  (Jx == 0 in 1D)
			kr[3][j] = dt / wTemp[0][j] * c_inverse * this.jz[j] * this.Bx;
			// dens*dvz/dt = 1/c*(JxBy - JyBx) (Jx == 0 in 1D)
			kr[4][j] = -dt / wTemp[0][j] * c_inverse * this.jy[j] * this.Bx;
			// dBy/dt = d/dx(vyBx - vxBy)
			kr[5][j] = dt * work[5][j];
			// dBz/dt = d/dx(vzBx - vxBz)
			kr[6][j] = dt * work[6][j];
		}
	}

	this.getResults = function () {
		//return this.w; // is this by reference? Apparently so.
		var results = this.w.slice();
		for (var i = 0; i < this.NUM_VARS; ++i) {
			results[i] = this.w[i].slice();
		}
		return results;
	}

}
