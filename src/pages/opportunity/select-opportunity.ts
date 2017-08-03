import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { NavController, PopoverController, NavParams, LoadingController } from 'ionic-angular';
import { LocalDataServiceProvider } from '../../providers/local-data-service/local-data-service';
import { PopoverComponent } from '../../components/popover.component';
import { AlertController } from 'ionic-angular';
import { Filter } from '../../components/filter.component';
import { OpportunityDetails } from './opportunity-details';

@Component({
  selector: 'select-opportunity',
  templateUrl: 'select-opportunity.html'
})
export class SelectOpportunity {

	public opportunities: any;
  public settings:any;
  public filterOptionValues: any;
  public filter_count: any;
  public isLoading: boolean;
  
  constructor(public navCtrl: NavController, 
    public params: NavParams, 
    public localDataService: LocalDataServiceProvider, 
    private alertCtrl: AlertController,
    private popoverCtrl: PopoverController, 
    private filterCtrl: PopoverController,
    private changeDetector: ChangeDetectorRef,
    private loadingCtrl: LoadingController) {

    this.loaddata();
  	
  }

  loaddata(query=null){
    
    this.isLoading = true;
    this.localDataService.getSettings().then(data => {
      this.settings = data;

      let options = {
        filterOptionValues: this.filterOptionValues,
        isOnline: this.settings.onlineMode,
        query: query
      };

      this.localDataService.getOpportunities(options)
      .then(data => {
        this.opportunities = data;
        this.isLoading = false;
      });

    });

	}

  showPopover(ev, objectInstance) {

      let popover = this.popoverCtrl.create(PopoverComponent, { 
          settings: this.settings, 
          objectType: 'opportunity',
          objectInstance: objectInstance,
          mainCtrl: this.navCtrl
        },{cssClass:'popover-more'});
      popover.present({ ev: ev });
      popover.onDidDismiss((data) => {

        this.loaddata();

      });

  } 

  showSearch(ev){

    let alert = this.alertCtrl.create();
    alert.setTitle("Search");
    alert.addInput({ type: 'text', label: 'Query', value: '', disabled: false });
    alert.addButton({
      text: 'GO'
    });
    alert.present();
    alert.onDidDismiss((data) => {

      let query = data[0];
      this.loaddata(query);

    });

  }

  showFilter(ev) {
    let filter = this.popoverCtrl.create(Filter);
    filter.present({
      ev: ev
    });

    let _that = this;

    filter.onDidDismiss((data) => {

      //_that.localDataService.updateQuoteFilterOptions(data);

      this.isLoading = true;
      let newOptions = {
        filterOptionValues: data,
        isOnline: this.settings.onlineMode
      };

      if(newOptions.filterOptionValues){

        //filter_count is equal to 1 IF dateModifiedParameter is not empty, else is equal to 0.
        this.filter_count = (newOptions.filterOptionValues && newOptions.filterOptionValues.dateModifiedParameter != '')? 1 : 0;

        //IFs will sum plus 1 for each element (currency, owner, status) in case of they are not null
        if (newOptions.filterOptionValues.filter.currency != null){
          this.filter_count += 1;
        }
        if (newOptions.filterOptionValues.filter.owner != null){
          this.filter_count += 1;
        }
        if (newOptions.filterOptionValues.filter.status != null){
          this.filter_count += 1;
        }
        
        this.filter_count += newOptions.filterOptionValues.quotesParameter.length;
        
      }
      
      //show loading bar while loading
      //let loading = this.loadingCtrl.create();
      //loading.present();
      
      // reload quotes with new params
      _that.localDataService.getOpportunities(newOptions)
        .then(newOpportunities => {

          this.opportunities = newOpportunities;
          this.changeDetector.detectChanges();
          //loading.dismiss();
          this.isLoading = false;
        });

    });
  }

  navigate(opp){
    this.navCtrl.push(OpportunityDetails,{
            opportunityId: opp.Id
          });
  }

}


