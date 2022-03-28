
//importScripts {box-muller}  from '../models/..';
//importScripts {gaussian}    from '../models/..';
//importScripts {normal-dist} from '..models/..'; 


export class ConfidenceInterval {
  constructor (private _lowerBound: Number, private_middle: Number, private_higherBound: number) {
   }

  get lowerBound() {
    return this._lowerBound
  }

  get middle(){
    return this._middle
  }

  get higherBound() {
    return this._higherBound
  }
}

// this class contains the following info: how many observations there are in an interval of a histogram (for conceptualization)

export class Interval {
    count: number
    higherBound: string
    lowerBound: string

    constructor (lowerBound: string, higherBound: string, decryptedCount: number){
        this.higherBound = higherBound
        this.lowerBound = lowerBound
        this.count = decryptedCount
    }
}

class ReferenceRange {
    readonly CI1: ConfidenceInterval
    readonly CI2: ConfidenceInterval

    constructor (intervals: Interval[]){
        //put my code: replace the arbitrary values 1,2,3
        this.CI1 = new ConfidenceInterval(1,2,3)
        this.CI2 = new ConfidenceInterval(4,5,6)
    }
}

// this class contains all info necessary to build a histogram chart with chart.js

export class ChartInformation {
    readonly intervals: Interval[]
    readonly unit: string
    readonly CI1: ConfidenceInterval
    readonly CI2: ConfidenceInterval

    readonly referenceRange: ReferenceRange

    constructor(intervals: Interval[], unit: string, public readonly cohortName: string){
        this.intervals = intervals
        this.unit = unit

        this.referenceRange = new ReferenceRange(intervals)

        this.CI1 = this.referenceRange.CI1
        this.CI2 = this.referenceRange.CI2
    }

  //  numberOfObservations():number {
  //      return this.intervals.map(i=>i.count).reduce((x1,x2) => x1+x2)
    }
}


class Bhattacharya {

    //const generateGaussian = import{'gaussian'};
    //const generateGaussian = import{'box-muller'};
    //const generateGaussian = import{'normal-dist'};

    const mean = 2; const variance = 0.5;

    // Data

    var inputVal1: any;
    var inputVal2: any;

    inputVal1 = new NormalDistribution (2000, mean, variance);  // remove the fixed given values for actual integration withing MedCo
    inputVal1 = inputVal1[inputVal1 > 0]; // get rid of negative results
    inputVal2 = new NormalDistribution (500, 3.75, 1);   // remove the fixed given values for actual integration withing MedCo
    inputVal2 = inputVal2[inputVal2 > 0]; // get rid of negative results


    //create the total histogram

    var d: any;
    var freq: any;
    var breaks: any;
    var plot: any;


    var dhist = hist(d, breaks = c(seq(0,20,0.25), plot = false); //these numbers can be adjusted based on how to display 
    var hist(d,breaks = seq(0,10,0.25),100);

    //var freq = T;

    const main = "histogram of patient results";
    const xlab = "concentration of analyte";

    var hist(inputVal1, breaks = seq(0,10,0.25), add = TRUE, col = rgb(0,1,0,0.3), freq = T);

    var hist(inputVal2, breaks = seq(0,10,0.25), add = TRUE, col = rgb(1,0,0,0.3), freq = T);

    //legend(x="topright", legend = ("inputVal1 : gaussian component", "inputVal2 : random noise", "bimodial mixture")


    //Bhattacharya method .. .. determines the parameter estimates of $\mu_i$ and $\sigma_i$ from the slope of log() of the distribution function

    var dhist = hist(d, main = "histogram with altered breaks", col = rgb(0,0,1,0.3), breaks = 20, xlab = "concentration of analyte", plot = T);

    var ly = log(dhist$counts);
    var dly = diff(ly);

    var df = data.frame(xm = dhist$mids[-length(dhist$mids)],ly = dly, counts = dhist$counts[-length(dhist$mids)]);

    var df = df(-nrow(df));

    var h = diff(df$xm)[1];

    var plot(data = df, xlab = "midpoints of the bins", ylab =expression(paste(Delta,"log(y)")));
    var abline(h = 0);
    var abline(v = df$xm, lty = 2, col = "#00000080");

    //determination of the \hat\mu_r by:  \hat\mu_r = \hat\lambda_r\ +\ \frac{h}{2}
    // and determination of \hat\sigma^2_r by:  \hat\sigma^2_r = \frac{h}{slope_r}\ -\ \frac{h^2}{12}

    //linear selection (old)

    //var linear.bit1 = subset(df[1:5,]);
    //var lm1 = lm(ly ~ xm, data = linear.bit1, weights = linear.bit1$counts);
    //var lambda1 = -coef(lm1)[1]/coef(lm1)[2]; lambda1;

    // the linear selection can be estimated by the EM algorithm. This algorith has 1 parameter initialization, 1 expectation and 1 maximization step

    // initialization step

    const i1 = s1 = i2 = s2 = 0; // model parameters for slope and intersect

    var init_params = function() {i1 = 2*runif(1), s1 = 2*runif(1), i2 = 2*runif(1), s2 = 2*runif(1), c(i1,s1,i2,s2)};

    //expectation step

    var e.step = function(mydata, params, sigma1=0.5,sigma2=1.5) {
    var w1 = rep(NA, nrow(mydata))
    var w2 = rep(NA, nrow(mydata))
    
    for (i=1, nrow(mydata)) {
      var r1 = abs(params[1] + params[2] * mydata[i,1] - mydata[i,2]) // residual for model 1
      var r2 = abs(params[3] + params[4] * mydata[i,1] - mydata[i,2]) // residual for model 2
      
      var exp1 = exp(-r1^2/sigma1^2)
      var exp2 = exp(-r2^2/sigma2^2)
      
      var w1[i] = exp1 / (exp1+exp2)
      var w2[i] = exp2 / (exp1+exp2)
      
    }
    
   // var cbind(w1,w2)  
  };

    // maximization step

    var wls = function(X,Y,W) {
    var solve(t(X) %*% W %*% X) %*% t(X) %*% W %*% Y   
    }; //weighted least squares
  
    var m.step = function(mydata, ws) {
    var X = cbind(rep(1, nrow(mydata)), mydata[,1]);
    var Y = as.matrix(mydata[,2], ncol=1);
    var p_1 = wls(X,Y,diag(ws[,1]));
    var p_2 = wls(X,Y,diag(ws[,2]));
  
    var c(p_1, p_2);
  };

// Combine steps to get EM algorithm

var em.2lines = function(mydata, tol=1e-3, max.step=1e3) {
    const step = 0;
    
    const s1 = i1 = s2 = i2 = 0; // model parameters for slope and intersect
    var params = init_params();
    
    repeat {
      var ws         = e.step(mydata, params)
      var old.params = params
      var params     = m.step(mydata, ws)
      
      if (norm(as.matrix(old.params-params), type="F") < tol) //convergence achieved
        break;
      
      var step <- step +1
      if (step > max.step)
        break;
    };
    
    var list(params = params,   // the estimated parameters
        var  weights = ws,      // the weighs for each datapoint x^i
        var class = apply(ws, 1, function(v) if (v[1]>v[2]) 1 else 2)) // the class for each datapoint
  };
  

  // results of the estimation

    var mydata = df[,1:2]; 
    var report = em.2lines(mydata);

  // find the steeper negative slope --> Guassian component

   var slope = report$params[which.min(report$params[c(2,4)])*2]; 
   var icept = report$params[which.min(report$params[c(2,4)])*2-1]; 

  // calculate Gaussian parameters

   var lambda1 = (-icept)/slope;
   var mu1 = lambda1 + h/2; paste(mu1);
   var sigma1 =sqrt(-h/slope - h^2/12); paste(sigma1);


   var plot(ly ~ xm, data = df, pch=19, col = report$class, xlab = "midpoints of the bins", ylab = expression(paste(Delta,"log(y)")));
   var abline(h = 0);
   var abline(c(icept,slope), col = "red");

  // with estimated reference interval
   var lowRI.bhat = qnorm(0.025,mu1, sigma1); lowRI.bhat; 
   var highRI.bhat = qnorm(0.975,mu1, sigma1); highRI.bhat;  

  // superimposed onto original data

   var hist(d,breaks = c(seq(0,10,0.25),100), freq = T, xlim = c(0,10), main = "Histogram of Patient Results", xlab = "Concentration of Analyte");

   var modeEstimated = rnorm(2000,mu1,sigma1);
   var modeEstimated = modeEstimated[modeEstimated > 0]; 

   var true.RIs =  quantile(mode1, c(0.025,0.975)); 


   var hist(modeEstimated, breaks = c(seq(0,10,0.25),100), add = TRUE, col = rgb(0,0,1,0.3), freq = T);

   var legend(x="topright", legend = c("bimodial mixture", "estimated Gaussian", "true RIs", "estimated RIs"), bty = "n", border = c("black","black",NA,NA), col = c(NA,NA,"black",rgb(1,0,0,0.7)),
      fill = c("white", rgb(0,0,1,0.3), NA, NA), lty = c(NA,NA,2,6));

   var abline(v=c(lowRI.bhat,highRI.bhat),col=rgb(1,0,0,0.7), lty=6);
   var abline(v=c(true.RIs),col="black",lty=2);

}







// for reference on the bhattacharya method and maximum likelihood, please check the following sources: 

// https://www.r-bloggers.com/2017/09/mining-your-routine-data-for-reference-intervals-hoffman-bhattacharya-and-maximum-likelihood/

// http://www.di.fc.ul.pt/~jpn/r/EM/EM.html






