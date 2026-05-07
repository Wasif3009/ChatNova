import {
  FormControl,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  Textarea,
} from "@chakra-ui/react";
import { Input } from "@chakra-ui/react";
import { Box, Text } from "@chakra-ui/react";
import "./../components/style.css";
import { IconButton, Spinner, useToast } from "@chakra-ui/react";
import { getSender, getSenderFull } from "../config/ChatLogics";
import { useEffect, useState } from "react";
import axios from "../config/axios";
import { FaArrowLeft } from "react-icons/fa";
import ProfileModal from "./miscellenous/ProfileModal";
import Lottie from "react-lottie";
import animationData from "../animations/Animation.json";
import { ChatState } from "../Context/ChatProvider";
import UpdateGroupChatModal from "./miscellenous/UpdateGroupChatModal";
import ScrollableChat from "./ScrollableChat";
import { BsThreeDotsVertical } from "react-icons/bs";
import { Flex } from "@chakra-ui/react";
import io from "socket.io-client";
const ENDPOINT = "http://localhost:3000";
var socket, selectedChatCompare;

const SingleChat = ({ fetchAgain, setFetchAgain }) => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [newMessage, setNewMessage] = useState("");
  const [socketConnected, setSocketConnected] = useState(false);
  const [typing, setTyping] = useState(false);
  const [istyping, setIsTyping] = useState(false);
  const toast = useToast();

  const defaultOptions = {
    loop: true,
    autoplay: true,
    animationData: animationData,
    rendererSettings: {
      preserveAspectRatio: "xMidYMid slice",
    },
  };

  const { selectedChat, setSelectedChat, user, notification, setNotification } =
    ChatState();

  const fetchMessages = async () => {
    if (!selectedChat) return;

    try {
      const config = {
        headers: {
          Authorization: `Bearer ${user.token}`,
        },
      };

      setLoading(true);

      const { data } = await axios.get(
        `/api/message/${selectedChat._id}`,
        config,
      );
      setMessages(data);
      setLoading(false);

      socket.emit("join chat", selectedChat._id);
    } catch (error) {
      toast({
        title: "Error Occured!",
        description: "Failed to Load the Messages",
        status: "error",
        duration: 5000,
        isClosable: true,
        position: "bottom",
      });
    }
  };

  const sendMessage = async (event) => {
    if (event.key === "Enter" && newMessage) {
      socket.emit("stop typing", selectedChat._id);
      try {
        const config = {
          headers: {
            "Content-type": "application/json",
            Authorization: `Bearer ${user.token}`,
          },
        };
        setNewMessage("");
        const { data } = await axios.post(
          "/api/message",
          {
            content: newMessage,
            chatId: selectedChat._id,
          },
          config,
        );
        socket.emit("new message", data);
        console.log(data);

        setMessages([...messages, data]);
      } catch (error) {
        toast({
          title: "Error Occured!",
          description: "Failed to send the Message",
          status: "error",
          duration: 5000,
          isClosable: true,
          position: "bottom",
        });
      }
    }
  };

  useEffect(() => {
    socket = io(ENDPOINT);
    socket.emit("setup", user);
    socket.on("connected", () => setSocketConnected(true));
    socket.on("typing", () => setIsTyping(true));
    socket.on("stop typing", () => setIsTyping(false));
  }, []);

  useEffect(() => {
    fetchMessages();
    selectedChatCompare = selectedChat;
  }, [selectedChat]);

  useEffect(() => {
    socket.on("message recieved", (newMessageRecieved) => {
      if (
        !selectedChatCompare ||
        selectedChatCompare._id !== newMessageRecieved.chat._id
      ) {
        if (!notification.includes(newMessageRecieved)) {
          setNotification([newMessageRecieved, ...notification]);
          setFetchAgain(!fetchAgain);
        }
      } else {
        setMessages([...messages, newMessageRecieved]);
      }
    });
  });

  const typingHandler = (e) => {
    setNewMessage(e.target.value);

    if (!socketConnected) return;

    if (!typing) {
      setTyping(true);
      socket.emit("typing", selectedChat._id);
    }
    let lastTypingTime = new Date().getTime();
    var timerLength = 3000;
    setTimeout(() => {
      var timeNow = new Date().getTime();
      var timeDiff = timeNow - lastTypingTime;
      if (timeDiff >= timerLength && typing) {
        socket.emit("stop typing", selectedChat._id);
        setTyping(false);
      }
    }, timerLength);
  };

  //AI FEATURES
  const handleSummarize = async () => {
    try {
      const text = messages.map((m) => m.content).join(" ");

      const { data } = await axios.post("/api/ai/summarize", { text });

      toast({
        title: "Summary",
        description: data.summary,
        status: "success",
        isClosable: true,
        duration: null,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to summarize",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const handleSentiment = async () => {
    try {
      const text = messages.map((m) => m.content).join(" ");

      const { data } = await axios.post("/api/ai/sentiment", { text });

      toast({
        title: "Sentiment",
        description: data.sentiment,
        status: "info",
        isClosable: true,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to analyze",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    }
  };

  return (
    <>
      {selectedChat ? (
        <>
          <Text
            fontSize={{ base: "28px", md: "30px" }}
            pb={3}
            px={2}
            w="100%"
            fontFamily="Work sans"
            display="flex"
            justifyContent={{ base: "space-between" }}
            alignItems="center"
          >
            <IconButton
              d={{ base: "flex", md: "none" }}
              icon={<FaArrowLeft />}
              onClick={() => setSelectedChat("")}
            />

            {messages &&
              (!selectedChat.isGroupChat ? (
                <Flex align="center" justify="space-between" w="100%">
                  <Box w="40px" />

                  <Text textAlign="center" flex="1">
                    {getSender(user, selectedChat.users)}
                  </Text>

                  <Flex align="center" gap={2}>
                    <ProfileModal
                      user={getSenderFull(user, selectedChat.users)}
                    />
                    <Menu>
                      <MenuButton
                        as={IconButton}
                        icon={<BsThreeDotsVertical />}
                        variant="ghost"
                        aria-label="Options"
                      />

                      <MenuList>
                        <MenuItem fontSize="sm" onClick={handleSummarize}>
                          Summarize Chat
                        </MenuItem>

                        <MenuItem fontSize="sm" onClick={handleSentiment}>
                          Detect Sentiment
                        </MenuItem>

                        {/* <MenuItem fontSize="sm"> Smart Reply</MenuItem> */}
                      </MenuList>
                    </Menu>
                  </Flex>
                </Flex>
              ) : (
                <>
                  {selectedChat.chatName}
                  <UpdateGroupChatModal
                    fetchMessages={fetchMessages}
                    fetchAgain={fetchAgain}
                    setFetchAgain={setFetchAgain}
                  />
                </>
              ))}
          </Text>

          <Box
            display="flex"
            flexDir="column"
            justifyContent="flex-end"
            p={3}
            bg="#E8E8E8"
            w="100%"
            h="100%"
            borderRadius="lg"
            overflowY="hidden"
          >
            {loading ? (
              <Spinner
                size="s"
                w={10}
                h={10}
                alignSelf="center"
                margin="auto"
              />
            ) : (
              <div className="messages">
                {" "}
                <ScrollableChat messages={messages} />
              </div>
            )}

            <FormControl onKeyDown={sendMessage} isRequired mt={3}>
              {istyping && (
                <Lottie
                  options={defaultOptions}
                  width={70}
                  style={{ marginBottom: 15, marginLeft: 0 }}
                />
              )}

              <Input
                variant="filled"
                bg="#E0E0E0"
                placeholder="Enter a message.."
                value={newMessage}
                onChange={typingHandler}
              />
            </FormControl>
          </Box>
        </>
      ) : (
        <Box
          display="flex"
          alignItems="center"
          justifyContent="center"
          h="100%"
        >
          <Text fontSize="3xl" pb={3} fontFamily="Work sans">
            Click on a user to start chatting
          </Text>
        </Box>
      )}
    </>
  );
};

export default SingleChat;
