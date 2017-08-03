import { Component } from '@angular/core';
import { NavController, PopoverController, NavParams, LoadingController } from 'ionic-angular';
import { LocalDataServiceProvider } from '../../providers/local-data-service/local-data-service';
import { PopoverComponent } from '../../components/popover.component';


@Component({
    selector: 'briefcase',
    templateUrl: 'briefcase.html'
})
export class Briefcase {

    public items: any;
    public settings:any;
    public isLoading: boolean;

    constructor(public navCtrl: NavController,
        public params: NavParams,
        public localDataService: LocalDataServiceProvider,
        private popoverCtrl: PopoverController,
        private loadingCtrl: LoadingController) {

        this.loaddata();

    }

    loaddata() {

        this.isLoading = true;
        this.localDataService.getSettings().then(data => {
            this.settings = data;
        });

        this.localDataService.getBriefcaseInfo()
            .then(data => {
                this.items = data;
                this.isLoading = false;
            });

    }

    showPopover(ev, objectType, objectInstance) {

        let popover = this.popoverCtrl.create(PopoverComponent, { 
            settings: this.settings, 
            objectType: objectType,
            objectInstance: objectInstance,
            mainCtrl: this.navCtrl,
            viewContext: 'BRIEFCASE'
          },{cssClass:'popover-more'});
        popover.present({ ev: ev });
          popover.onDidDismiss((data) => {

            this.loaddata();

          });

    } 

    showFilter(ev) {
        console.log('show filter');
        /*let filter = this.popoverCtrl.create(Filter);
        filter.present({
            ev: ev
        });

        let _that = this;

        filter.onDidDismiss((data) => {

            //_that.localDataService.updateQuoteFilterOptions(data);

            let newOptions = {
                filterOptionValues: data,
                isOnline: this.on_off
            };

            //show loading bar while loading
            let loading = this.loadingCtrl.create();
            loading.present();

            // reload quotes with new params
            _that.localDataService.getOpportunities(newOptions)
                .then(newOpportunities => {

                    this.opportunities = newOpportunities;
                    this.changeDetector.detectChanges();
                    loading.dismiss();

                });

        }); */
    } 

    toggleSelection(i) { 
        this.items[i].selected = !this.items[i].selected;
    }

    /*navigate(opp) {
        this.navCtrl.push(OpportunityDetails, {
            firstPassed: opp.customer,
            secondPassed: opp.status
        });
    } */

}


