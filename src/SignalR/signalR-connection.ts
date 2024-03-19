import * as signalR from "@microsoft/signalr";
import appSettings from './appSettings';

const settings = appSettings();

const URL: any = settings.URL;

class Connector {
    private connection: signalR.HubConnection;
    public events: (ShowResults:(result: number) => void) => void;
    static instance: Connector;
    constructor() {
        this.connection = new signalR.HubConnectionBuilder()
            .withUrl(URL)
            .withAutomaticReconnect()
            .build();
            this.start()
        this.events = (onVotingFinished) => {
            this.connection.on("VotingFinished", (result: number) => {
                onVotingFinished(result);
            });
        };
    }

    public start = async () => {
       await this.connection.start().catch(err => document.write(err));
    }
    
    public ShowResults = (groupName: string, result: number) => {
        this.connection.send("ShowResults",groupName, result).catch(err => console.error(err));
    }
    public joinGroup = (groupName: string) => {
        setTimeout( () => {
            this.connection.invoke("joinGroup", groupName).catch(err => console.error(err));
     }, 250);
    }
    public ShowVote = (groupName: string) => {
        this.connection.send("ShowVote",groupName).catch(err => console.error(err));
    }

    public static getInstance(): Connector {
        if (!Connector.instance)
            Connector.instance = new Connector();
        return Connector.instance;
    }
}
export default Connector.getInstance;