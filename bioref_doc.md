# The repositories
Here is the fork of the front-end. The branch of interest is "bioref" https://github.com/CHUV-DS/glowing-bear-medco-bioref

The fork for the backend is here (the branch name is bioref) https://github.com/CHUV-DS/medco_bioref
	
The functionment of the new explore-statistics module
In the front-end there are few key things to understand. I'll describe the way the logic works in the order in which the code is executed.
First the user communicates with an Angular component to set the parameters of the query:
[explore-statistics settings component](https://github.com/CHUV-DS/glowing-bear-medco-bioref/blob/bioref/src/app/modules/gb-explore-statistics-module/panel-components/gb-explore-statistics-settings/gb-explore-statistics-settings.component.ts)
 

When the user clicks on the run button of this settings component the *explore statistics service* is called via its executeQuery function
[explore-statistics service](https://github.com/CHUV-DS/glowing-bear-medco-bioref/blob/bioref/src/app/services/explore-statistics.service.ts).



When the aggregated result is returned by the servers the value is read by the *results component* using the *Emitter* object from the *explore statistics service*. This emitter is a sort of observable that can stream multiple values throughout time.
[Here is the result component's logic](https://github.com/CHUV-DS/glowing-bear-medco-bioref/blob/bioref/src/app/modules/gb-explore-statistics-module/panel-components/gb-explore-statistics-results/gb-explore-statistics-results.component.ts).

# The API: 
After an explore-statistics request, the front-end receives information from the back-end that describes a histogram.
The histogram contains different intervals (as many as specified by the client via the *number of buckets* parameter).
Each interval is described by its lower and higher bound and the encrypted count of observations that fall within this interval.
The information is structured in the following way:

```Typescript
//This class describes an interval from a histogram. 
export class ApiInterval {
  encCount: string // the encrypted count of observations that fall within this interval
  higherBound: string
  lowerBound: string
}

//describes a histogram received from the backend after an explore-statistics request
export class ApiExploreStatisticsResponse {

  intervals: ApiInterval[]

  unit: string // the unit of the x-axis of the histogram

  timers: {
    name: string
    milliseconds: number
  }[]
}
```

After the front-end client receives this information the counts are all decrypted using the private key of the client.
After this phase, the client is left with the following data:

```Typescript
export class Interval {
    count: number 
    higherBound: string
    lowerBound: string
}

export class ChartInformation {
    intervals: Interval[]
    unit: string
}
```

The `ChartInformation` object may be used at will to build visualisations or statistics.

# Example usages of the functionality

## Weight of people diagnosed with Diabetes:

Imagine one wants to derive statistics on the weight of people diagnosed with Diabetes.

The user would first browse the ontology menu of the MedCo interface in order to find the *Diabetes* medical concept.
Once this is done the user drops this *Diabetes* concept in the set of constraints of the explore functionality. This medical concept will be used to build the cohort of patients that are diagnosed with Diabetes. 
When the cohort is built it can be set as a parameter of the explore-statistics request.
The second parameter that is necessary is the *weight* medical concept. It can once again be retrieved from the ontology.
The third parameter is the number of intervals that will be constructed in the histogram.

After the execution of the query and the counts are decrypted, the following information is returned to the client:
Imagine we specified that we wanted 3 bins in our histogram. Then after decryption the information at the disposal of the client 
follows the following structure:

In this example:
* 10 patients' weight is between 50 and 60 kg
* 42 patients have a weight between 60 and 70 kg
* 20 patients have a weight between 70 and 80 kg
```javascript

  ChartInformation: {
      unit: "kg",

      intervals: [
          { 
              count: 10,
              lowerBound: 50,
              higherBound: 60
          },
          { 
              count: 42,
              lowerBound: 60,
              higherBound: 70
          },
          { 
              count: 20,
              lowerBound: 70,
              higherBound: 80
          }

      ]
  }

```

Any concept's distribution can be visualized as long as the concept is of numerical type. For the moment concepts which are categorical (e.g. the gender of a person) are not supported as the concept which observations' are counted.

On the other hand cohorts (the population of focus) can be constructed upon complex constraints including categorical concepts. In the previous example, the population was composed of patients that are diagnosed with diabetes. One could, thanks to the explore functionality of MedCo, construct a population based on more than one constraint:
For example, it is possible to create constraints that would impose that the cohort is composed of patients that are:
diagnosed with Diabetes AND that are males AND that are taller than 170cm.

One could even use exclusion constraints. One can add any exclusion constraint to a set of inclusion constraints (e.g. patients that are not diagnosed with cancer).
