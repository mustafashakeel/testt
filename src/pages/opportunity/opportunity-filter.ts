import { Component } from '@angular/core';
import { LocalDataServiceProvider } from '../../providers/local-data-service/local-data-service';
import { ViewController, NavParams, TapClick} from 'ionic-angular';


@Component({
	selector: "opportunity-filter",
  templateUrl: 'opportunity-filter.html',
})



export class OpportunityFilter {
  public Filter_quotes: any;
  public Final= [];
	public filters: any;
  public shownGroup = null;
  public Opportunity_: any;

  //varables for the selections and radios
  filter_quotes: any;
  filter_date: any;
  filter_currency:any;
  filter_owner: any;
  filter_status: any; 

  
  constructor(public localDataService: LocalDataServiceProvider, 
                public viewCtrl: ViewController, 
                public inputData: NavParams, public Click: TapClick) {

  this.loaddata();

  }


  loaddata(){
  	this.localDataService.getOpportunityQueryFilters()
      .then (data => {
        this.filters = data;
        this.filters.selected_quote = false;
        this.filters.selected_date = false;
        this.filters.selected_currency = true;
        this.filters.selected_owner = true;
        this.filters.selected_status = true;

      });

      let params = {};
     this.localDataService.getQuotes(params)
      .then (data => {
        this.Filter_quotes = data;
        
     });

     this.localDataService.getOpportunities(params)
      .then (data => {
        this.Opportunity_ = data;
        
     });
    
	}


  clearAll(){
    this.filter_quotes = "";
    this.filters.selected_quote = false;
    this.filter_date = "";
    this.filters.selected_date = false;
    this.filter_currency = "";
    this.filter_owner = "";
    this.filter_status = "";

  }

  FilterQuotes(){
    let searchTerm : any;
    searchTerm = this.filter_quotes;

      if(searchTerm === 'expiredCatalogs'){  // if the user selected to search by Expired Catalogs
      console.log('IF CATALOG');
      
      this.Filter_quotes = this.Filter_quotes.filter((item) => {
              return item.lastModified.status == 'expiredCatalogs';
          });
      }

      if(searchTerm === 'expiredQuotes'){  //if the user selected to search by Expired Quotes
      console.log('IF Quotes');

      this.Filter_quotes = this.Filter_quotes.filter((item) => {
              return item.lastModified.status == 'expiredQuotes';
          });
      }

      if(searchTerm === 'checkedOut'){  //if the user selected to search by CheckedOut
      console.log('IF CheckedOut');
      this.Filter_quotes = this.Filter_quotes.filter((item) => {
              return item.checkedOut == 'yes';
          });


        //Array ids will contain Quotes's ID filtered in the previous Filter command 
        let ids = [];
        let f:any;
        for (f in this.Filter_quotes){
          console.log("F Value" + this.Filter_quotes[f]);
          ids.push(this.Filter_quotes[f].id);
          console.log("IDS Value" + ids);

        }
          // loop to insert into the FINAL array only the elements in Opportunity's id array that match the ids array
          let final= [];
          for(let i in ids){
            console.log('ids :' + ids[i]);
            for(let o in this.Opportunity_){
              console.log("list : "+ this.Opportunity_[o].id);
              if(ids[i] == this.Opportunity_[o].id){
                console.log("Match : "+ this.Opportunity_[o].id);
                final.push(this.Opportunity_[o]);
              }
            }

          }

      
        this.Final = final;

        
      }

      if(searchTerm === 'viewOnly'){
      console.log('IF ViewOnly');
      this.Filter_quotes = this.Filter_quotes.filter((item) => {
              return item.lastModified.status == 'viewOnly';
          });

      }

     // if (this.Filter_array[0]){
     //   console.log("IF FILTER");
     //   this.Filter_array = this.Filter_opportunity.filter((item) => {
     //        return item.id == '01';
     //    }); 

     //  }
     //this.OppCtrl.setOpportunity();
  }

  

  toggleFilterQuoteSelection(){
    this.filters.selected_quote = !this.filters.selected_quote;
  }

  toggleFilterDateSelection(){
    this.filters.selected_date = !this.filters.selected_date;
  }
  toggleFilterCurrencySelection(){
    this.filters.selected_currency = !this.filters.selected_currency;
  }

  toggleFilterQuoteChange(){
    console.log("Filter");
    let response : any;  
    debugger;
    this.FilterQuotes();
    //console.log("REPONSE:" + response[0].accountName);

  };



  toggleGroup(group) {
    if (this.isGroupShown(group)) {
        this.shownGroup = null;
    } else {
        this.shownGroup = group;
    }
  };
  isGroupShown(group) {
    return this.shownGroup === group;
  };
}
