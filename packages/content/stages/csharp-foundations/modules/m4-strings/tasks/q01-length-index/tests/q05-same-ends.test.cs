public class Q05SameEndsTests
{
    [Fact(DisplayName = "Q05 先頭と末尾")]
    public void Q05SameEnds()
    {
        Assert.Equal("yes", Answers.Q05SameEnds("aba"));
        Assert.Equal("no", Answers.Q05SameEnds("abc"));
        Assert.Equal("yes", Answers.Q05SameEnds("A"));
    }
}
