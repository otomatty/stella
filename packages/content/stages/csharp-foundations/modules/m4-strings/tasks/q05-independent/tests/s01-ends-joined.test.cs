public class S01EndsJoinedTests
{
    [Fact(DisplayName = "S01 端の表示")]
    public void S01EndsJoined()
    {
        Assert.Equal("ac", Answers.S01EndsJoined("abc"));
        Assert.Equal("xx", Answers.S01EndsJoined("x"));
        Assert.Equal("empty", Answers.S01EndsJoined(""));
        Assert.Equal("ab", Answers.S01EndsJoined("ab"));
    }
}
