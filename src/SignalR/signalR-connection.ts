import * as signalR from "@microsoft/signalr";
import appSettings from './appSettings';

interface IParticipant {
    id: string,
    name: string,
    vote: number,
    votingId: string
}

const settings = appSettings();

const URL: any = settings.URL;

class Connector {
    private connection: signalR.HubConnection;
    public events: (ShowResults: (result: number, votingId: string) => void, UserJoined: (votingId: string) => void, NewVote: (votingId: string) => void) => void;
    static instance: Connector;
    constructor() {
        this.connection = new signalR.HubConnectionBuilder()
            .withUrl(URL)
            .withAutomaticReconnect()
            .build();
        this.start()
        this.events = (onVotingFinished, onUserJoined, onNewVote) => {
            this.connection.on("VotingFinished", (result: number, votingId: string) => {
                onVotingFinished(result, votingId);
            });
            this.connection.on("UserJoined", (votingId: string) => {
                onUserJoined(votingId);
            });
            this.connection.on("NewVote", (votingId: string) => {
                onNewVote(votingId);
            });
        };
    }

    public start = async () => {
        await this.connection.start().catch(err => document.write(err));
    }

    public ShowResults = (groupName: string, result: number) => {
        this.connection.send("ShowResults", groupName, result).catch(err => console.error(err));
    }
    public joinGroup = (groupName: string) => {
        if (this.connection.state === signalR.HubConnectionState.Connecting) {
            var interval = setInterval(() => {
                if (this.connection.state === signalR.HubConnectionState.Connected) {
                    this.connection.invoke("joinGroup", groupName).catch(err => console.error(err));
                    clearInterval(interval);
                }
                else{
                    console.log("waiting for connection")
                }
            }, 250);
        }
        else {
            this.connection.invoke("joinGroup", groupName).catch(err => console.error(err));
        }
    }
    public ShowVote = (groupName: string) => {
        this.connection.send("ShowVote", groupName).catch(err => console.error(err));
    }

    public static getInstance(): Connector {
        if (!Connector.instance)
            Connector.instance = new Connector();
        return Connector.instance;
    }
}
export default Connector.getInstance;