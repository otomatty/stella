public class S05CountBlanksTests
{
    [Fact(DisplayName = "S05 区切りの個数")]
    public void S05CountBlanks()
    {
        Assert.Equal(2, Answers.S05CountBlanks("a b\u3000c"));
        Assert.Equal(0, Answers.S05CountBlanks(""));
        Assert.Equal(2, Answers.S05CountBlanks("a  b"));
        Assert.Equal(2, Answers.S05CountBlanks("\u3000\u3000"));
    }
}
