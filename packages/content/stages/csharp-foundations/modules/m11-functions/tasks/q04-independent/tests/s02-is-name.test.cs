public class S02IsNameTests
{
    [Fact(DisplayName = "S02 名前の条件")]
    public void S02IsName()
    {
        Assert.Equal(true, Answers.S02IsName("AB"));
        Assert.Equal(false, Answers.S02IsName("A"));
        Assert.Equal(false, Answers.S02IsName("Ab"));
        Assert.Equal(true, Answers.S02IsName("ABCDE"));
        Assert.Equal(false, Answers.S02IsName("ABCDEF"));
    }
}
