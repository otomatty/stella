public class Q23TailNTests
{
    [Fact(DisplayName = "Q23 末尾 N 文字")]
    public void Q23TailN()
    {
        Assert.Equal("ef", Answers.Q23TailN("abcdef", 2));
        Assert.Equal("def", Answers.Q23TailN("abcdef", 3));
        Assert.Equal("A", Answers.Q23TailN("A", 1));
        Assert.Equal("", Answers.Q23TailN("ab", 0));
    }
}
