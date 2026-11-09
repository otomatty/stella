public class S08AllUpperTests
{
    [Fact(DisplayName = "S08 英字の条件")]
    public void S08AllUpper()
    {
        Assert.Equal("yes", Answers.S08AllUpper("ABC"));
        Assert.Equal("no", Answers.S08AllUpper("AbC"));
        Assert.Equal("no", Answers.S08AllUpper(""));
        Assert.Equal("yes", Answers.S08AllUpper("A"));
        Assert.Equal("no", Answers.S08AllUpper("ABC1"));
    }
}
