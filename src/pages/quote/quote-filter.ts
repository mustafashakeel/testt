import { Component } from '@angular/core';
import { LocalDataServiceProvider } from '../../providers/local-data-service/local-data-service';
import {ViewController} from 'ionic-angular';

@Component({
  selector: "quote-filter",
  templateUrl: 'quote-filter.html',
  providers: [LocalDataServiceProvider]
})
export class QuoteFilter {
  public filter: {};
  public isQuotesSelected: boolean;
  public isDateModifiedSelected: boolean;
  public quotesSelected: any;
  public datesSelected: any;

  public quoteParameters: any;
  public dateModifiedParameter: string;


  constructor(public localDataService: LocalDataServiceProvider,
    private viewCtrl: ViewController) {
    this.isQuotesSelected = false;
    this.isDateModifiedSelected = false;
    this.quoteParameters = [];
    this.dateModifiedParameter = '';
    this.loaddata();

  }

  loaddata() {
    this.localDataService.getQuoteFilterOptions()
      .then(data => {
        this.filter = data;
        console.log(this.filter);
      });
  }

  toggleQuotesSelection() {
    this.isQuotesSelected = !this.isQuotesSelected;
  }

  toggleDateModifiedSelection() {
    this.isDateModifiedSelected = !this.isDateModifiedSelected;
  }

  setDateModifiedParameter(Parameter: string) {
    if (this.dateModifiedParameter === Parameter) {
      // set to empty string when clicked twice
      this.dateModifiedParameter = '';
    } else {
      this.dateModifiedParameter = Parameter;
    }
  }

  toggleQuotesParameter(Parameter: string) {
    if (this.quoteParameters.includes(Parameter)) {
      let i = this.quoteParameters.indexOf(Parameter);
      this.quoteParameters.splice(i, 1);
    } else {
      this.quoteParameters.push(Parameter);
    }

    console.log(this.quoteParameters);
  }

  clearAll() {
    this.isQuotesSelected = false;
    this.isDateModifiedSelected = false;
    this.dateModifiedParameter = '';
    this.loaddata();
    // TODO: make clear checks from filter
  }

  undoCamelCase(str) {
    let tmp = str.replace(/([A-Z])/g, " $1");
    return tmp.charAt(0).toUpperCase() + tmp.slice(1);
  }

  applyFilter() {
    console.log('applying filter');
    let options = {
      filter: this.filter, // contains currency, owner, status, selections
      dateModifiedParameter: this.dateModifiedParameter,
      quotesParameter: this.quoteParameters,
    }
    console.log(options);

    // Now send new filter data back to view
    this.viewCtrl.dismiss(options);


  }

}
