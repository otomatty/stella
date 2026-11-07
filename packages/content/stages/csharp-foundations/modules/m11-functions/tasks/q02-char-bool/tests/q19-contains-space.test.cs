public class Q19ContainsSpaceTests
{
    [Fact(DisplayName = "Q19 空白を含むか")]
    public void Q19ContainsSpace()
    {
        Assert.Equal(true, Answers.Q19ContainsSpace("a b"));
        Assert.Equal(false, Answers.Q19ContainsSpace("ab"));
        Assert.Equal(false, Answers.Q19ContainsSpace(""));
    }
}
