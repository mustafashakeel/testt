import { Component } from '@angular/core';
import { NavController, NavParams } from 'ionic-angular';
//import { AddProduct } from "./add-product";
import { LocalDataServiceProvider } from "../../../providers/local-data-service/local-data-service";
import { SelectOpportunity } from '../../opportunity/select-opportunity';

@Component({
    selector: 'account-summary',
    templateUrl: 'account-summary.html'
})
export class AccountSummaryPage {

    public account: any;

    public accountData: any;
    public visibleFields: any;
    public editableFields: any;
    public visibleFieldsLabels: any;

      public settings: any;

    constructor(public navCtrl: NavController,
        public params: NavParams,
        public localDataService: LocalDataServiceProvider) {

        this.account = params.get("account");
        this.loadData();

    }

    loadData() {
        
        if(!this.account){
            return;
        }
        
        this.localDataService.getAccountSummary(this.account.Id)
            .then(data => {
                this.accountData = data;
            });

        this.localDataService.getSummaryLayout('account', this.account.Id)
            .then(data => {
                this.visibleFields = data;

                // Now create array of labels to be accesed with "*ngFor"
                let labels = [];
                Object.keys(data).forEach((key) => {
                    console.log(key, data[key]);
                    labels.push({
                        //asCamelCase: key,
                        asCamelCase: data[key].name,
                        name: data[key].label
                        //name: this.undoCamelCase(key),
                    })
                });

                let column, res = {}

                // determine editable fields
                for (var i = 0; i < data.length; i++) {

                    column = data[i];
                    if (column.updateable) {

                        if (column.restrictedPicklist) {
                            res[column.name] = {
                                type: 'selection',
                                options: column.picklistValues,
                                value: ''
                            }
                        }
                        else {
                            res[column.name] = {
                                type: 'text',
                                options: null,
                                value: ''
                            }
                        }


                    }

                }

                this.editableFields = res;

                this.visibleFieldsLabels = labels;

            }); 

    }

    markSelection(label, option) {
       
        if (this.editableFields[label].value === option) {
            this.editableFields[label].value = '';
        } else {
            this.editableFields[label].value = option;
        }
        

    }

    undoCamelCase(str): string {
        let tmp = str.replace(/([A-Z])/g, " $1");
        return tmp.charAt(0).toUpperCase() + tmp.slice(1);
    }

    isEditable(label): boolean {

        if (!this.editableFields) return;

        let editableFields = Object.keys(this.editableFields);
        if (editableFields.indexOf(label.asCamelCase) > -1) {
            return true;
        }
        return false;

    }

    isTextField(label): boolean {
        if (this.editableFields[label.asCamelCase].type === 'text') {
            return true;
        }
        return false;
    }

    isSelectField(label): boolean {
        if (this.editableFields[label.asCamelCase].type === 'selection') {
            return true;
        }
        return false;
    }

    doGoToOpportunities() {
        this.navCtrl.push(SelectOpportunity, {


        });
    }

    goToAddProduct() {
        /*this.navCtrl.push(AddProduct, {
            firstPassed: this.quoteSummary.accountName,
            secondPassed: this.quoteSummary.status
        }); */
    }

    reset() {
        this.loadData();
    }

    saveChanges() {
        console.log(this.editableFields);
        let accountDelta: any = {};
        let accountId = 0;

        for(var i=0; i<this.editableFields.length; i++){
            accountDelta[this.editableFields[i].name] = this.editableFields[i].value;
        }

        debugger;
        //this.localDataService.saveAccount(accountId, accountDelta);

    }


}