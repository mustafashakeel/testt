import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { NavController, PopoverController, NavParams, LoadingController } from 'ionic-angular';
import { AlertController } from 'ionic-angular';
import { LocalDataServiceProvider } from '../../providers/local-data-service/local-data-service';
import { PopoverComponent } from '../../components/popover.component';
import { Filter } from '../../components/filter.component';
import { QuoteDetails } from "./quote-details";

@Component({
  selector: 'select-quote',
  templateUrl: 'select-quote.html'
})
export class SelectQuote {

  public quotes: any;
  public settings: any;
  public filterOptionValues: any;

  // if opportunity is selected - quotes will filter to it
  public opportunityId: any;
  public opportunity: any;

  public isLoading: boolean;

  constructor(public navCtrl: NavController,
    public params: NavParams,
    private alertCtrl: AlertController,
    public localDataService: LocalDataServiceProvider,
    private popoverCtrl: PopoverController,
    private filterCtrl: PopoverController,
    private changeDetector: ChangeDetectorRef,
    private loadingCtrl: LoadingController) {

    this.opportunityId = params.get("opportunityId");
    this.opportunity = params.get("opportunity");

    this.loaddata();

  }

  loaddata(query=null) {

    this.isLoading = true;
    this.localDataService.getSettings()
      .then(data => {
        this.settings = data;

        let options = {
          filterOptionValues: this.filterOptionValues,
          isOnline: this.settings.onlineMode,
          query: query,
          opportunityId: this.opportunityId            // if set, show only quotes from specified opportunity
        };

        this.localDataService.getQuotes(options)
          .then(data => {
            this.quotes = data;
            this.isLoading = false;
          });
            
      });


  }

  showPopover(ev, objectInstance) {

      let popover = this.popoverCtrl.create(PopoverComponent, { 
          settings: this.settings, 
          objectType: 'quote',
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

      let newOptions = {
        filterOptionValues: data,
        isOnline: this.settings.onlineMode
      };

      //show loading bar while loading
      //let loading = this.loadingCtrl.create();
      //loading.present();
      this.isLoading = true;
      // reload quotes with new params
      _that.localDataService.getQuotes(newOptions)
        .then(newQuotes => {

          this.quotes = newQuotes;
          this.changeDetector.detectChanges();
          //loading.dismiss();
          this.isLoading = false;
          
        });

    });
  }

  navigate(quote) {
    this.navCtrl.push(QuoteDetails, {
      quoteId: quote.Id
    });
  }

}
